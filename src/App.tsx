import { MantineProvider, TextInput, Textarea, Button, Box, Text, ScrollArea, Code } from '@mantine/core'
import '@mantine/core/styles.css'
import { useRef, useEffect, useState } from 'react'
import JSON5 from 'json5'
import { useAppStore } from './store'
import { messageTemplates } from './message-templates'

function App() {
  const { url, iframeUrl, iframeMessage, setUrl, setIframeMessage, loadUrl } = useAppStore()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [receivedMessages, setReceivedMessages] = useState<{ timestamp: string; data: unknown }[]>([])
  const [embeddedMode, setEmbeddedMode] = useState(false)
  const [panelRatio, setPanelRatio] = useState(80)
  const [isDragging, setIsDragging] = useState(false)

  // Check for URL query parameters on component mount
  useEffect(() => {
    const search = window.location.search + window.location.hash
    if (search.startsWith('?')) {
      const params = new URLSearchParams(search.substring(1))

      const embedUrlParam = params.get('embedUrl')
      if (embedUrlParam) {
        const decodedUrl = decodeURIComponent(embedUrlParam)
        setUrl(decodedUrl)
        loadUrl()
      }

      if (params.get('embedded') === 'true') {
        setEmbeddedMode(true)
      }
    }
  }, [setUrl, loadUrl, setEmbeddedMode])

  // Listen for messages from iframe or parent depending on mode
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (embeddedMode) {
        if (event.source === window.parent && event.source !== window) {
          const timestamp = new Date().toLocaleTimeString()
          setReceivedMessages(prev => [...prev, { timestamp, data: event.data }])
        }
      } else if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
        const timestamp = new Date().toLocaleTimeString()
        setReceivedMessages(prev => [...prev, { timestamp, data: event.data }])
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [embeddedMode])

  // ----- Reliable dragging implementation -----
  // Use Pointer Events + an overlay over the iframe while dragging.
  useEffect(() => {
    if (!isDragging) return

    // Disable text selection while dragging
    const prevUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100
      setPanelRatio(Math.min(Math.max(newRatio, 10), 90))
    }

    const stopDragging = () => setIsDragging(false)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging, { once: true })
    window.addEventListener('blur', stopDragging, { once: true })

    return () => {
      document.body.style.userSelect = prevUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('blur', stopDragging)
    }
  }, [isDragging])

  const beginDrag: React.PointerEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    // In case the element supports it in some browsers
    try { (e.target as Element).setPointerCapture?.(e.pointerId) } catch { /* empty */ }
    setIsDragging(true)
  }

  const postMessageToTarget = (message: string) => {
    const sendMessage = (targetWindow: Window) => {
      try {
        const parsedMessage = JSON5.parse(message)
        targetWindow.postMessage(parsedMessage, '*')
      } catch (error) {
        console.warn('Failed to parse message as JSON5, sending as string:', error)
        targetWindow.postMessage(message, '*')
      }
    }

    if (embeddedMode) {
      if (window.parent) {
        sendMessage(window.parent)
      }
    } else if (iframeRef.current && iframeRef.current.contentWindow) {
      sendMessage(iframeRef.current.contentWindow)
    }
  }

  const loadTemplate = (template: Record<string, unknown>) => {
    const templateJson = JSON.stringify(template, null, 2)

    setIframeMessage(templateJson)

    // Select the placeholder text after a short delay to ensure textarea is updated
    setTimeout(() => {
      if (textareaRef.current) {
        const text = textareaRef.current.value
        const placeholderRegex = /<[A-Z\s]+>/
        const match = text.match(placeholderRegex)
        if (match) {
          const startIndex = match.index!
          const endIndex = startIndex + match[0].length
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(startIndex, endIndex)
        }
      }
    }, 10)
  }

  return (
      <MantineProvider>
        <Box style={{
          height: '100vh',
          display: 'grid',
          gridTemplateRows: embeddedMode ? '1fr' : 'auto 1fr',
          gridTemplateColumns: '1fr',
          overflow: 'hidden'
        }}>
          {/* Top Panel */}
          {!embeddedMode && (
              <Box p="md" style={{ borderBottom: '1px solid #e0e0e0' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <TextInput
                      placeholder="Enter URL for iframe"
                      value={url}
                      onChange={(e) => setUrl(e.currentTarget.value)}
                      style={{ flex: 1 }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          loadUrl()
                        }
                      }}
                  />
                  <Button onClick={loadUrl}>Load</Button>
                </div>
              </Box>
          )}

          {/* Main Content Area with resizable divider */}
          <Box
              ref={containerRef}
              style={{
                display: 'grid',
                gridTemplateColumns: embeddedMode ? '1fr' : `${panelRatio}% 6px ${100 - panelRatio}%`,
                height: '100%',
                overflow: 'hidden'
              }}
          >
            {/* Main Panel with iframe */}
            {!embeddedMode && (
                <Box p="md" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
                  {/* Glass pane during drag to keep events in the parent */}
                  {isDragging && (
                      <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            inset: 0,
                            cursor: 'col-resize',
                            pointerEvents: 'auto',
                            zIndex: 2,
                            // Transparent overlay
                            background: 'transparent',
                          }}
                      />
                  )}

                  <iframe
                      ref={iframeRef}
                      src={iframeUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        backgroundColor: 'black',
                      }}
                      title="Content Frame"
                      allow="autoplay; fullscreen; microphone; camera; midi; encrypted-media; picture-in-picture; display-capture; clipboard-read; clipboard-write"
                  />
                </Box>
            )}

            {/* Divider */}
            {!embeddedMode && (
                <Box
                    role="separator"
                    aria-orientation="vertical"
                    onPointerDown={beginDrag}
                    style={{
                      cursor: 'col-resize',
                      background: '#e0e0e0',
                      position: 'relative',
                      zIndex: 3, // Above iframe so pointerdown always fires
                    }}
                    title="Drag to resize"
                />
            )}

            {/* Right Panel with textarea */}
            <Box
                p="md"
                style={{
                  height: '100%',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
            >
              <Text size="sm" fw={500} mb="xs">
                Send messages
              </Text>

              {/* Template buttons */}
              <Box style={{ display: 'flex', gap: '5px', marginBottom: '10px', justifyContent: 'center' }}>
                <Button size="xs" variant="outline" onClick={() => loadTemplate(messageTemplates.openSourceMedia)}>
                  Open source media
                </Button>
                <Button size="xs" variant="outline" onClick={() => loadTemplate(messageTemplates.openProject)}>
                  Open project
                </Button>
              </Box>

              <Textarea
                  ref={textareaRef}
                  placeholder="Enter message"
                  value={iframeMessage}
                  onChange={(e) => setIframeMessage(e.currentTarget.value)}
                  rows={8}
                  autosize={false}
                  resize="none"
                  style={{
                    fontFamily: 'monospace',
                    marginBottom: '10px'
                  }}
              />
              <Button size="sm" onClick={() => postMessageToTarget(iframeMessage)}>
                {embeddedMode ? 'Post message to parent' : 'Post message to iframe'}
              </Button>

              {/* Received messages area */}
              <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', marginBottom: '0.5rem' }}>
                <Text size="sm" fw={500}>
                  Received messages
                </Text>
                <Button size="xs" variant="light" onClick={() => setReceivedMessages([])}>
                  Clear
                </Button>
              </Box>
              <ScrollArea style={{ flex: 1, border: '1px solid #e0e0e0', padding: '5px', borderRadius: '4px' }}>
                {receivedMessages.length === 0 ? (
                    <Text size="sm" c="dimmed">No messages received yet.</Text>
                ) : (
                    <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
                      {[...receivedMessages].reverse().map((msg, index) => (
                          <Box component="li" key={index} mb="xs">
                            <Text size="xs" c="dimmed">{msg.timestamp}</Text>
                            <Code block>{JSON.stringify(msg.data, null, 2)}</Code>
                          </Box>
                      ))}
                    </Box>
                )}
              </ScrollArea>
            </Box>
          </Box>
        </Box>
      </MantineProvider>
  )
}

export default App
