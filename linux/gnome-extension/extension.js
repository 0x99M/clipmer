import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const DBUS_INTERFACE = `
<node>
  <interface name="com.clipmer.PasteHelper">
    <method name="Paste"/>
  </interface>
</node>`;

class PasteService {
  constructor() {
    const seat = Clutter.get_default_backend().get_default_seat();
    this._device = seat.create_virtual_device(
      Clutter.InputDeviceType.KEYBOARD_DEVICE
    );
  }

  _notify(key, state) {
    this._device.notify_keyval(
      Clutter.get_current_event_time() * 1000,
      key,
      state
    );
  }

  // Async form so GJS hands us the invocation, which is the only way to learn
  // who called. Without this any peer on the session bus could synthesize
  // Ctrl+V into whatever window currently has focus — on Wayland that is a
  // capability the caller would not otherwise have.
  PasteAsync(_params, invocation) {
    if (!this._callerIsClipmer(invocation)) {
      invocation.return_error_literal(
        Gio.DBusError,
        Gio.DBusError.ACCESS_DENIED,
        'Only Clipmer may call Paste'
      );
      return;
    }

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
      this._notify(Clutter.KEY_Control_L, Clutter.KeyState.PRESSED);
      this._notify(Clutter.KEY_v, Clutter.KeyState.PRESSED);
      this._notify(Clutter.KEY_v, Clutter.KeyState.RELEASED);
      this._notify(Clutter.KEY_Control_L, Clutter.KeyState.RELEASED);
      return GLib.SOURCE_REMOVE;
    });

    invocation.return_value(null);
  }

  _callerIsClipmer(invocation) {
    try {
      const sender = invocation.get_sender();
      if (!sender) return false;
      const reply = Gio.DBus.session.call_sync(
        'org.freedesktop.DBus',
        '/org/freedesktop/DBus',
        'org.freedesktop.DBus',
        'GetConnectionUnixProcessID',
        new GLib.Variant('(s)', [sender]),
        new GLib.VariantType('(u)'),
        Gio.DBusCallFlags.NONE,
        500,
        null
      );
      const [pid] = reply.deepUnpack();
      const [ok, contents] = GLib.file_get_contents(`/proc/${pid}/cmdline`);
      if (!ok) return false;
      return new TextDecoder().decode(contents).replace(/\0/g, ' ').includes('clipmer');
    } catch {
      // Could not establish the caller, so refuse. The cost is a failed paste;
      // the alternative is honouring a request from an unknown peer.
      return false;
    }
  }

  destroy() {
    this._device.run_dispose();
  }
}

export default class ClipboardPasteExtension {
  _service = null;
  _dbus = null;
  _ownerId = null;

  enable() {
    this._service = new PasteService();
    this._dbus = Gio.DBusExportedObject.wrapJSObject(
      DBUS_INTERFACE,
      this._service
    );
    this._dbus.export(
      Gio.DBus.session,
      '/com/clipmer/PasteHelper'
    );
    this._ownerId = Gio.bus_own_name(
      Gio.BusType.SESSION,
      'com.clipmer.PasteHelper',
      Gio.BusNameOwnerFlags.NONE,
      null, null, null
    );
  }

  disable() {
    if (this._dbus) {
      this._dbus.unexport();
      this._dbus = null;
    }
    if (this._ownerId) {
      Gio.bus_unown_name(this._ownerId);
      this._ownerId = null;
    }
    if (this._service) {
      this._service.destroy();
      this._service = null;
    }
  }
}
