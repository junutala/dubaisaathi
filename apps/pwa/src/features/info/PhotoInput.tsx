import { useId } from 'react';
import type { ReactNode } from 'react';

/**
 * Taking a photograph, the way a PWA actually does it: a file input the phone answers with
 * its camera. This is CLAUDE.md's rule about not ruling a device out in advance, settled by
 * construction rather than by care — there is nothing here to query, nothing to probe and no
 * branch that could decide this phone has no camera. Every phone has this control, it needs
 * no permission from us, and the phone itself offers whatever it can: the camera, the gallery,
 * or a file on a laptop.
 *
 * `capture` asks for the rear camera, because every photograph this tile wants — a reception
 * card, a hotel entrance, a passport page — is a thing in front of the traveller. A browser
 * that does not honour it shows its own picker, which is the fallback, already wired in.
 */
export function PhotoInput({
  onPhoto,
  className,
  children,
}: {
  readonly onPhoto: (photo: Blob) => void;
  readonly className: string;
  readonly children: ReactNode;
}) {
  const id = useId();
  return (
    <label className={className} htmlFor={id}>
      {children}
      <input
        id={id}
        className="photo-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cancelling the camera fires this with nothing chosen; that is not a failure and
          // must not wipe a photo the traveller already took.
          if (file) onPhoto(file);
          // Cleared so photographing the same file twice still fires a change.
          event.target.value = '';
        }}
      />
    </label>
  );
}
