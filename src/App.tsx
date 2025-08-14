import { MantineProvider, TextInput, Textarea, Button, Box, Text, ScrollArea } from '@mantine/core'
import '@mantine/core/styles.css'
import { useRef, useEffect, useState } from 'react'
import JSON5 from 'json5'
import { useAppStore } from './store'
import { messageTemplates } from './message-templates'

function App() {
  const { url, iframeUrl, iframeMessage, setUrl, setIframeMessage, loadUrl } = useAppStore()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [receivedMessages, setReceivedMessages] = useState<string[]>([])
  const [embeddedMode, setEmbeddedMode] = useState(false)

  // Check for URL query parameters on component mount
  useEffect(() => {
    // Simple query parameter parsing that handles URLs with # and ?
    const search = window.location.search + window.location.hash
    if (search.startsWith('?')) {
      const params = new URLSearchParams(search.substring(1))

      const embedUrlParam = params.get('embedUrl')
      if (embedUrlParam) {
        const decodedUrl = decodeURIComponent(embedUrlParam)
        setUrl(decodedUrl)
        // Automatically load the URL into the iframe
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
          const messageText = `[${timestamp}] ${JSON.stringify(event.data, null, 2)}`
          setReceivedMessages(prev => [...prev, messageText])
        }
      } else if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
        const timestamp = new Date().toLocaleTimeString()
        const messageText = `[${timestamp}] ${JSON.stringify(event.data, null, 2)}`
        setReceivedMessages(prev => [...prev, messageText])
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [embeddedMode])

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

        {/* Main Content Area - Split 80%/20% */}
        <Box style={{
          display: 'grid',
          gridTemplateColumns: embeddedMode ? '1fr' : '80% 20%',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Main Panel - 80% width with iframe */}
          {!embeddedMode && (
            <Box p="md" style={{ height: '100%', overflow: 'hidden' }}>
              <iframe
                ref={iframeRef}
                src={iframeUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: 'black'
                }}
                title="Content Frame"
                allow="autoplay; fullscreen; microphone; camera; midi; encrypted-media; picture-in-picture; display-capture; clipboard-read; clipboard-write"
              />
            </Box>
          )}

          {/* Right Panel - 20% width with textarea */}
          <Box p="md" style={{
            borderLeft: embeddedMode ? undefined : '1px solid #e0e0e0',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
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
              <Box>
                {receivedMessages.length === 0 ? (
                  <Text size="sm" color="dimmed">No messages received yet.</Text>
                ) : (
                  receivedMessages.map((msg, index) => (
                    <Text key={index} size="sm" mb="xs" style={{ wordWrap: 'break-word' }}>
                      {msg}
                    </Text>
                  ))
                )}
              </Box>
            </ScrollArea>
          </Box>
        </Box>
      </Box>
    </MantineProvider>
  )
}

export default App
