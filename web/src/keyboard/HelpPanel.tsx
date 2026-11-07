import { Dialog } from "../components/Dialog";
import { SHORTCUTS } from "./shortcuts";

export function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose}>
      <table className="shortcuts">
        <tbody>
          {SHORTCUTS.map((item) => (
            <tr key={item.id} data-shortcut-row={item.id}>
              <td>
                <kbd>{item.keys}</kbd>
              </td>
              <td>{item.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        Every shortcut also has a button. Shortcuts are off while typing.
      </p>
    </Dialog>
  );
}
