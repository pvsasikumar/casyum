import React, { useCallback, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Pilcrow,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  canEdit: boolean;
}

const toolbarBtn =
  'p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-transparent hover:border-white/20 cursor-pointer transition-colors';

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write about the event...',
  canEdit,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);

  const syncFromProps = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    if (focusedRef.current) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  useEffect(() => {
    syncFromProps();
  }, [syncFromProps]);

  const exec = (command: string, arg?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, arg);
    onChange(el.innerHTML);
  };

  const handleInput = () => {
    const el = editorRef.current;
    if (el) onChange(el.innerHTML);
  };

  const handleLink = () => {
    const url = window.prompt('Enter link URL');
    if (url) exec('createLink', url);
  };

  const handleImage = () => {
    const url = window.prompt('Enter image URL');
    if (url) exec('insertImage', url);
  };

  if (!canEdit) {
    return (
      <div
        className="prose-invert text-sm text-white/80 leading-relaxed [&_a]:text-violet-300 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:text-lg [&_h3]:font-bold [&_h4]:text-base [&_h4]:font-bold [&_strong]:text-white [&_em]:italic [&_u]:underline"
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="flex items-center flex-wrap gap-1 p-2 border-b border-white/10 bg-white/[0.03]">
        <button type="button" className={toolbarBtn} title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')}>
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={toolbarBtn} title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')}>
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={toolbarBtn} title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')}>
          <Underline className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-white/10 mx-1" />
        <button type="button" className={toolbarBtn} title="Bullet list" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')}>
          <List className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={toolbarBtn} title="Numbered list" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertOrderedList')}>
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-white/10 mx-1" />
        <button type="button" className={toolbarBtn} title="Heading" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('formatBlock', 'H3')}>
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={toolbarBtn} title="Sub heading" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('formatBlock', 'H4')}>
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={toolbarBtn} title="Paragraph" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('formatBlock', 'P')}>
          <Pilcrow className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-white/10 mx-1" />
        <button type="button" className={toolbarBtn} title="Link" onMouseDown={(e) => e.preventDefault()} onClick={handleLink}>
          <Link2 className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={toolbarBtn} title="Image" onMouseDown={(e) => e.preventDefault()} onClick={handleImage}>
          <ImageIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={() => { focusedRef.current = true; }}
        onBlur={() => { focusedRef.current = false; syncFromProps(); }}
        data-placeholder={placeholder}
        className="min-h-[180px] px-4 py-3 text-sm text-white/80 leading-relaxed outline-none focus:border-violet-500/40 [&_a]:text-violet-300 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:text-lg [&_h3]:font-bold [&_h4]:text-base [&_h4]:font-bold [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-white/25"
      />
    </div>
  );
};
