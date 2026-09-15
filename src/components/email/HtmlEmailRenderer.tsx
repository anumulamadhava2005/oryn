/**
 * HtmlEmailRenderer — renders rich HTML email bodies using WebView.
 * Features:
 * - High-contrast text normalization to prevent unreadable black text on dark backgrounds
 * - Injects dynamic dark-mode CSS overrides with !important priority
 * - Active DOM sanitizer stripping obsolete color/bgcolor attributes and dark inline colors
 * - Supports 'dark' (default) and 'light' (original canvas) rendering modes
 * - Auto-calculates content height and handles safe external link routing
 */

import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, Linking, View, useWindowDimensions } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Colors, Typography, Radius } from '@/constants/theme';

interface Props {
  html: string;
  themeMode?: 'dark' | 'light';
  estimatedHeight?: number;
  onHeightChange?: (height: number) => void;
}

const getCss = (mode: 'dark' | 'light') => {
  if (mode === 'light') {
    return `
      *, *::before, *::after {
        box-sizing: border-box;
        -webkit-text-size-adjust: 100%;
      }
      html, body {
        margin: 0;
        padding: 12px;
        background-color: #FFFFFF !important;
        color: #1A1A1A !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: ${Typography.size.sm}px;
        line-height: 1.6;
        word-break: break-word;
        overflow-wrap: break-word;
        border-radius: ${Radius.lg}px;
      }
      a { color: #0066CC !important; text-decoration: underline; }
      img { max-width: 100% !important; height: auto !important; border-radius: 6px; margin: 6px 0; }
      table { width: 100% !important; border-collapse: collapse; margin: 8px 0; }
      td, th { padding: 6px 8px; border: 1px solid #E5E5EA; }
      th { background: #F2F2F7; font-weight: 600; }
      pre, code { background: #F2F2F7; padding: 6px 8px; border-radius: 6px; font-size: 13px; overflow-x: auto; color: #111; }
      blockquote { border-left: 3px solid #0066CC; margin: 8px 0; padding: 4px 12px; color: #555; }
      hr { border: none; border-top: 1px solid #E5E5EA; margin: 12px 0; }
      ul, ol { padding-left: 20px; margin: 6px 0; }
      p { margin: 6px 0; }
    `;
  }

  // Dark Mode CSS
  return `
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-text-size-adjust: 100%;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: ${Colors.background} !important;
      color: #F2F2F7 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${Typography.size.sm}px;
      line-height: 1.6;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    
    /* Universal text color enforcement to defeat inline style="color: black" */
    p, span, div, td, th, li, font, b, strong, em, i, u, label, small, blockquote, section, article, h1, h2, h3, h4, h5, h6 {
      color: #F2F2F7 !important;
      background-color: transparent !important;
    }

    font {
      color: #F2F2F7 !important;
    }

    a, a * {
      color: ${Colors.systemBlue} !important;
      text-decoration: underline !important;
    }
    a:hover { text-decoration: underline; }
    
    img {
      max-width: 100% !important;
      height: auto !important;
      border-radius: 6px;
      margin: 6px 0;
    }
    table {
      width: 100% !important;
      border-collapse: collapse;
      margin: 8px 0;
      background-color: transparent !important;
    }
    td, th {
      padding: 6px 8px;
      border: 1px solid ${Colors.border} !important;
      color: #F2F2F7 !important;
    }
    th {
      background-color: ${Colors.card} !important;
      font-weight: 600;
    }
    pre, code {
      background-color: ${Colors.card} !important;
      color: #30D158 !important;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 13px;
      overflow-x: auto;
      border: 1px solid ${Colors.borderMuted};
    }
    blockquote {
      border-left: 3px solid ${Colors.systemBlue};
      margin: 8px 0;
      padding: 4px 12px;
      color: ${Colors.textSecondary} !important;
      background-color: rgba(0, 122, 255, 0.05) !important;
    }
    hr {
      border: none;
      border-top: 1px solid ${Colors.border};
      margin: 12px 0;
    }
    ul, ol { padding-left: 20px; margin: 6px 0; }
    p { margin: 6px 0; }
  `;
};

export function HtmlEmailRenderer({
  html,
  themeMode = 'dark',
  estimatedHeight = 150,
  onHeightChange,
}: Props) {
  const { width } = useWindowDimensions();
  const [webViewHeight, setWebViewHeight] = useState<number>(estimatedHeight);

  const wrappedHtml = useMemo(
    () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>${getCss(themeMode)}</style>
    </head>
    <body>
      <div id="content-container">
        ${html}
      </div>
      <script>
        function sanitizeDOM() {
          ${
            themeMode === 'dark'
              ? `
            try {
              var all = document.querySelectorAll('*');
              for (var i = 0; i < all.length; i++) {
                var el = all[i];
                if (el.hasAttribute('color')) el.removeAttribute('color');
                if (el.hasAttribute('text')) el.removeAttribute('text');
                if (el.hasAttribute('bgcolor')) el.removeAttribute('bgcolor');
                
                if (el.style) {
                  // Force crisp contrast color
                  el.style.setProperty('color', '#F2F2F7', 'important');
                  
                  // Clear hardcoded white/light backgrounds
                  var bg = el.style.backgroundColor || el.style.background;
                  if (bg) {
                    var lower = bg.toLowerCase();
                    if (lower.indexOf('white') !== -1 || lower.indexOf('#fff') !== -1 || lower.indexOf('rgb(255') !== -1 || lower.indexOf('rgba(255') !== -1) {
                      el.style.setProperty('background-color', 'transparent', 'important');
                    }
                  }
                }
              }
            } catch (e) {}
          `
              : ''
          }
        }

        function sendHeight() {
          sanitizeDOM();
          var container = document.getElementById('content-container') || document.body;
          var height = Math.max(container.scrollHeight, document.body.offsetHeight, 100);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'resize', height: height }));
        }

        window.addEventListener('DOMContentLoaded', sendHeight);
        window.addEventListener('load', sendHeight);
        setTimeout(sendHeight, 50);
        setTimeout(sendHeight, 250);
        setTimeout(sendHeight, 800);
        setTimeout(sendHeight, 1800);
      </script>
    </body>
    </html>
  `,
    [html, themeMode]
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'resize' && typeof data.height === 'number') {
          const newHeight = Math.max(100, Math.ceil(data.height) + 16);
          setWebViewHeight(newHeight);
          onHeightChange?.(newHeight);
        }
      } catch (err) {
        // ignore JSON parse error
      }
    },
    [onHeightChange]
  );

  const isLight = themeMode === 'light';

  return (
    <View
      style={[
        styles.container,
        { height: webViewHeight },
        isLight && styles.containerLight,
      ]}
    >
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
  containerLight: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  webview: {
    backgroundColor: 'transparent',
    flex: 1,
  },
});
