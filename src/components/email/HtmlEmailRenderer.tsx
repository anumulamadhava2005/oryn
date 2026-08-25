/**
 * HtmlEmailRenderer — renders rich HTML email bodies using WebView.
 * Injects dark-mode CSS, auto-calculates content height, and handles link taps.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, Linking, View, useWindowDimensions } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Colors, Typography } from '@/constants/theme';

interface Props {
  html: string;
  estimatedHeight?: number;
  onHeightChange?: (height: number) => void;
}

const DARK_CSS = `
  * {
    box-sizing: border-box;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: ${Colors.background} !important;
    color: ${Colors.text} !important;
    font-family: -apple-system, system-ui, sans-serif;
    font-size: ${Typography.size.sm}px;
    line-height: 1.6;
    word-wrap: break-word;
    overflow-wrap: break-word;
    -webkit-text-size-adjust: none;
  }
  a { color: ${Colors.systemBlue} !important; text-decoration: none; }
  a:hover { text-decoration: underline; }
  img { max-width: 100% !important; height: auto !important; border-radius: 8px; margin: 6px 0; }
  table { width: 100% !important; border-collapse: collapse; margin: 8px 0; }
  td, th { padding: 6px 8px; border: 1px solid ${Colors.border}; }
  th { background: ${Colors.card}; font-weight: 600; }
  pre, code {
    background: ${Colors.card};
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 13px;
    overflow-x: auto;
  }
  blockquote {
    border-left: 3px solid ${Colors.systemBlue};
    margin: 8px 0;
    padding: 4px 12px;
    color: ${Colors.textSecondary};
  }
  h1, h2, h3, h4, h5, h6 {
    color: ${Colors.text} !important;
    margin: 12px 0 6px;
  }
  hr { border: none; border-top: 1px solid ${Colors.border}; margin: 12px 0; }
  ul, ol { padding-left: 20px; margin: 6px 0; }
  p { margin: 6px 0; }
`;

export function HtmlEmailRenderer({ html, estimatedHeight = 150, onHeightChange }: Props) {
  const { width } = useWindowDimensions();
  const [webViewHeight, setWebViewHeight] = useState<number>(estimatedHeight);

  const wrappedHtml = useMemo(
    () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>${DARK_CSS}</style>
    </head>
    <body>
      <div id="content-container">
        ${html}
      </div>
      <script>
        function sendHeight() {
          var container = document.getElementById('content-container') || document.body;
          var height = Math.max(container.scrollHeight, document.body.offsetHeight, 100);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'resize', height: height }));
        }
        window.addEventListener('load', sendHeight);
        setTimeout(sendHeight, 100);
        setTimeout(sendHeight, 500);
        setTimeout(sendHeight, 1500);
      </script>
    </body>
    </html>
  `,
    [html]
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'resize' && typeof data.height === 'number') {
          const newHeight = Math.max(100, Math.ceil(data.height) + 12);
          setWebViewHeight(newHeight);
          onHeightChange?.(newHeight);
        }
      } catch (err) {
        // ignore JSON parse error
      }
    },
    [onHeightChange]
  );

  return (
    <View style={[styles.container, { height: webViewHeight }]}>
      <WebView
        source={{ html: wrappedHtml }}
        style={[styles.webview, { width: '100%' }]}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url !== 'about:blank' && request.url.startsWith('http')) {
            Linking.openURL(request.url);
            return false;
          }
          return true;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  webview: {
    backgroundColor: 'transparent',
    flex: 1,
  },
});
