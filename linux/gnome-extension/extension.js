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

  // Field 4 of /proc/<pid>/stat. Parsed from the last ')' because field 2 is
  // the executable name and may itself contain spaces and parentheses.
  _parentPid(pid) {
    try {
      const [ok, contents] = GLib.file_get_contents(`/proc/${pid}/stat`);
      if (!ok) return 0;
      const text = new TextDecoder().decode(contents);
      const fields = text.slice(text.lastIndexOf(')') + 2).split(' ');
      return parseInt(fields[1], 10) || 0;
    } catch {
      return 0;
    }
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
      let [pid] = reply.deepUnpack();

      // Clipmer has no D-Bus binding of its own, so it shells out to `gdbus`
      // to make this call. The bus therefore attributes the request to that
      // helper — /usr/bin/gdbus — and never to Clipmer itself. Checking only
      // the immediate caller rejected every legitimate paste.
      //
      // Walk up instead, and accept if Clipmer is an ancestor. The executable
      // is read from /proc/<pid>/exe rather than the command line, because argv
      // belongs to the caller: `gdbus --dest com.clipmer.PasteHelper` contains
      // the string "clipmer" and would pass a naive substring test.
      for (let depth = 0; depth < 4 && pid > 1; depth++) {
        try {
          const exe = GLib.file_read_link(`/proc/${pid}/exe`);
          if (GLib.path_get_basename(exe) === 'clipmer') return true;
        } catch {
          // Unreadable link, e.g. an already-reaped intermediate. Keep walking.
        }
        pid = this._parentPid(pid);
        if (!pid) return false;
      }
      return false;
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
