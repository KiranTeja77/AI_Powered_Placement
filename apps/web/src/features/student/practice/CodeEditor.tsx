import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/editor/editor.api'
import 'monaco-editor/languages/definitions/cpp/register'
import 'monaco-editor/languages/definitions/java/register'
import 'monaco-editor/languages/definitions/javascript/register'
import 'monaco-editor/languages/definitions/python/register'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import { useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/lib/theme/theme-context'

// Bundle Monaco with the app instead of loading it from a CDN, and give it its one worker.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() }
loader.config({ monaco })

export type EditorLanguage = 'python' | 'java' | 'cpp' | 'javascript'

/** Reads a design token. Monaco needs concrete colours, so they come from the same tokens. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
const noHash = (colour: string) => colour.replace('#', '')

/** Builds the editor theme from the current tokens, so it follows light and dark. */
function applyTheme(mode: 'light' | 'dark') {
  const name = `placewise-${mode}`
  monaco.editor.defineTheme(name, {
    base: mode === 'dark' ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: noHash(token('--text')) },
      { token: 'comment', foreground: noHash(token('--text-muted')) },
      { token: 'keyword', foreground: noHash(token('--primary')) },
      { token: 'string', foreground: noHash(token('--success')) },
      { token: 'number', foreground: noHash(token('--warning')) },
      { token: 'type', foreground: noHash(token('--chart-4')) },
    ],
    colors: {
      'editor.background': token('--surface'),
      'editor.foreground': token('--text'),
      'editorLineNumber.foreground': token('--text-muted'),
      'editorLineNumber.activeForeground': token('--text'),
      'editor.lineHighlightBackground': token('--surface-muted'),
      'editor.selectionBackground': token('--primary-subtle'),
      'editorCursor.foreground': token('--primary'),
      'editorWidget.background': token('--surface'),
      'editorWidget.border': token('--border'),
      'editorIndentGuide.background1': token('--border'),
    },
  })
  monaco.editor.setTheme(name)
}

interface CodeEditorProps {
  language: EditorLanguage
  value: string
  onChange: (value: string) => void
}

/** The code editor. Loaded on demand because Monaco is large. */
export default function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const { resolved } = useTheme()

  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      theme={`placewise-${resolved}`}
      beforeMount={() => applyTheme(resolved)}
      onChange={(v) => onChange(v ?? '')}
      loading={<Skeleton className="h-full w-full" />}
      options={{
        ariaLabel: 'Code editor',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        renderLineHighlight: 'line',
        padding: { top: 8, bottom: 8 },
      }}
    />
  )
}
