import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { Bold, Italic, Link2, List, ListOrdered, Underline } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toSafeUrl } from '../lib/links'
import { Dialog } from './Dialog'

interface Props {
  initialHtml: string
  placeholder: string
  onChange: (html: string) => void
}

/**
 * The journal card: a rich-text area with the design's toolbar
 * (bold, italic, underline | bullets, numbers, link).
 * The editor schema only keeps those formats, so stored notes stay clean.
 */
export default function RichTextEditor({ initialHtml, placeholder, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        trailingNode: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml || '',
    editorProps: {
      attributes: { class: 'editor-content', 'aria-label': 'Journal note', 'aria-multiline': 'true' },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  return (
    <div className="journal-card">
      <EditorContent editor={editor} className="editor-scroll" />
      {editor && <Toolbar editor={editor} />}
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linkDraft, setLinkDraft] = useState<string | null>(null)
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      link: e.isActive('link'),
    }),
  })

  function onLink() {
    if (active.link) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    setLinkDraft('')
  }

  function applyLink() {
    const url = toSafeUrl(linkDraft ?? '')
    setLinkDraft(null)
    const chain = editor.chain().focus().extendMarkRange('link')
    if (!url) return
    if (editor.state.selection.empty) {
      // No text selected: insert the address itself as the link text.
      chain.insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] }).run()
    } else {
      chain.setLink({ href: url }).run()
    }
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <ToolButton label="Bold" pressed={active.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={24} strokeWidth={3} />
      </ToolButton>
      <ToolButton label="Italic" pressed={active.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={24} strokeWidth={2.4} />
      </ToolButton>
      <ToolButton
        label="Underline"
        pressed={active.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline size={24} strokeWidth={2.4} />
      </ToolButton>
      <span className="toolbar-divider" aria-hidden="true" />
      <ToolButton
        label="Bulleted list"
        pressed={active.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={26} strokeWidth={2.2} />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        pressed={active.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={26} strokeWidth={2.2} />
      </ToolButton>
      <span className="toolbar-spacer" aria-hidden="true" />
      <ToolButton label={active.link ? 'Remove link' : 'Add link'} pressed={active.link} onClick={onLink}>
        <Link2 size={26} strokeWidth={2.2} />
      </ToolButton>

      {linkDraft !== null && (
        <Dialog
          title="Add a link"
          onClose={() => setLinkDraft(null)}
          actions={[
            { label: 'Cancel', onClick: () => setLinkDraft(null) },
            { label: 'Add link', onClick: applyLink, variant: 'primary' },
          ]}
        >
          <input
            className="dialog-input"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyLink()}
          />
        </Dialog>
      )}
    </div>
  )
}

function ToolButton(props: { label: string; pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`tool${props.pressed ? ' is-pressed' : ''}`}
      aria-label={props.label}
      aria-pressed={props.pressed}
      // Keep the text selection while tapping a tool.
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}
