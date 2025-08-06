import { MantineProvider, TextInput, Textarea, Button, Box, Text } from '@mantine/core'
import '@mantine/core/styles.css'
import { useRef } from 'react'
import JSON5 from 'json5'
import { useAppStore } from './store'

function App() {
  const { url, iframeUrl, iframeMessage, setUrl, setIframeMessage, loadUrl } = useAppStore()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const postMessageToIframe = (message: string) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        // Try to parse as JSON5 first, then send the parsed object
        const parsedMessage = JSON5.parse(message)
        iframeRef.current.contentWindow.postMessage(parsedMessage, '*')
      } catch (error) {
        // If parsing fails, send as plain string
        console.warn('Failed to parse message as JSON5, sending as string:', error)
        iframeRef.current.contentWindow.postMessage(message, '*')
      }
    }
  }

  return (
    <MantineProvider>
      <Box style={{
        height: '100vh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gridTemplateColumns: '1fr',
        overflow: 'hidden'
      }}>
        {/* Top Panel */}
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

        {/* Main Content Area - Split 80%/20% */}
        <Box style={{
          display: 'grid',
          gridTemplateColumns: '80% 20%',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Main Panel - 80% width with iframe */}
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

          {/* Right Panel - 20% width with textarea */}
          <Box p="md" style={{
            borderLeft: '1px solid #e0e0e0',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Text size="sm" fw={500} mb="xs">
              Iframe communication
            </Text>
            <Textarea
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
            <Button size="sm" onClick={() => postMessageToIframe(iframeMessage)}>
              Post message to iframe
            </Button>
          </Box>
        </Box>
      </Box>
    </MantineProvider>
  )
}

export default App
