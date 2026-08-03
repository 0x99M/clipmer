#!/bin/bash
# Runs on package removal. Two pieces of per-user state outlive the app and the
# package manager knows about neither:
#
#   1. The GNOME paste helper extension, which exports a keystroke-injection
#      service on the session bus.
#   2. Our custom GNOME keybinding, which would keep squatting the shortcut.
#
# Best-effort throughout — a failure here must never fail the removal.

set +e

REAL_USER="${SUDO_USER:-$USER}"
[ -z "$REAL_USER" ] && exit 0
[ "$REAL_USER" = "root" ] && exit 0
id "$REAL_USER" >/dev/null 2>&1 || exit 0

USER_HOME="$(getent passwd "$REAL_USER" | cut -d: -f6)"
[ -z "$USER_HOME" ] && exit 0
USER_UID="$(id -u "$REAL_USER")"

EXT_ID="clipmer-paste@clipmer.local"
SCHEMA="org.gnome.settings-daemon.plugins.media-keys"
KEY_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/clipmer-toggle/"

as_user() {
  sudo -u "$REAL_USER" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/${USER_UID}/bus" \
    "$@" 2>/dev/null
}

# ── Paste helper extension ────────────────────────────────────────────────────
as_user gnome-extensions disable "$EXT_ID" >/dev/null
rm -rf "${USER_HOME}/.local/share/gnome-shell/extensions/${EXT_ID}"

# ── GNOME keybinding ──────────────────────────────────────────────────────────
CURRENT="$(as_user gsettings get "$SCHEMA" custom-keybindings)"

case "$CURRENT" in
  *clipmer-toggle*)
    # Strip our entry in whichever position it occupies, then collapse an empty
    # list back to the '@as []' form GLib expects.
    CLEANED="$(printf '%s' "$CURRENT" \
      | sed -e "s|'${KEY_PATH}', ||g" \
            -e "s|, '${KEY_PATH}'||g" \
            -e "s|'${KEY_PATH}'||g")"
    case "$CLEANED" in
      "[]"|"[ ]"|"") CLEANED="@as []" ;;
    esac
    as_user gsettings set "$SCHEMA" custom-keybindings "$CLEANED" >/dev/null
    as_user dconf reset -f "$KEY_PATH" >/dev/null
    ;;
esac

# ── Autostart entry, which also lives outside the package ─────────────────────
rm -f "${USER_HOME}/.config/autostart/clipmer.desktop"
rm -f "${USER_HOME}/.config/autostart/clipmer-launch.sh"

exit 0
