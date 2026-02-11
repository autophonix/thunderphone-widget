# @thunderphone/widget

Embed a ThunderPhone voice AI agent on any website. Users can talk to your agent directly from your site using their browser microphone.

## Installation

```bash
npm install @thunderphone/widget
```

## Quick Start

```tsx
import { ThunderPhoneWidget } from '@thunderphone/widget'
import '@thunderphone/widget/style.css'

function App() {
  return (
    <ThunderPhoneWidget
      apiKey="pk_live_your_publishable_key"
      agentId={123}
    />
  )
}
```

## Setup

1. Log in to [app.thunderphone.com](https://app.thunderphone.com)
2. Go to **Developers** to create a publishable API key and configure allowed domains
3. Enable the **Embeddable Widget** toggle on the agent you want to expose
4. Use the agent's ID and your publishable key in the widget code above

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `apiKey` | `string` | Yes | Your publishable API key (`pk_live_...`) |
| `agentId` | `number` | Yes | ID of the agent to connect to |
| `apiBase` | `string` | No | API base URL (defaults to `https://api.thunderphone.com/v1`) |
| `onConnect` | `() => void` | No | Called when the voice session connects |
| `onDisconnect` | `() => void` | No | Called when the session ends |
| `onError` | `(error) => void` | No | Called on errors. Error has `error` (code) and `message` fields |
| `className` | `string` | No | Additional CSS class for the widget container |

## Styling

The widget uses plain CSS with `tp-` prefixed classes, so it won't conflict with your styles. You can override any of these classes:

| Class | Element |
|-------|---------|
| `.tp-widget` | Outer container (inline-flex) |
| `.tp-button` | All buttons (circular, 44px) |
| `.tp-button--start` | Start/mic button |
| `.tp-button--mute` | Mute toggle button |
| `.tp-button--end` | End call button |
| `.tp-status` | Status text container |
| `.tp-status__name` | Agent name |
| `.tp-status__text` | Connection state / timer |

Example — custom colors:

```css
.tp-button--start {
  background: #4f46e5;
}
.tp-button--start:hover {
  background: #4338ca;
}
```

## Domain Restrictions

Your publishable key can be restricted to specific domains in the Developers settings page. Requests from unlisted domains will be rejected. `localhost` is always allowed for development.

Wildcard subdomains are supported: `*.example.com` matches `app.example.com`, `docs.example.com`, etc.

## CDN / Script Tag

If you're not using a bundler, you can load the widget via script tag. This version bundles React internally so no dependencies are needed.

```html
<link rel="stylesheet" href="https://cdn.thunderphone.com/widget/v0.2.1/style.css" />
<script src="https://cdn.thunderphone.com/widget/v0.2.1/widget.js"></script>

<div id="thunderphone"></div>

<script>
  ThunderPhone.mount({
    element: '#thunderphone',
    apiKey: 'pk_live_your_publishable_key',
    agentId: 123,
  })
</script>
```

Use `latest` instead of a version number for the most recent release (cached for 5 minutes):

```
https://cdn.thunderphone.com/widget/latest/widget.js
https://cdn.thunderphone.com/widget/latest/style.css
```

`ThunderPhone.mount()` accepts the same options as the React component props above, plus `element` (CSS selector or DOM element). It returns a handle for cleanup:

```js
const widget = ThunderPhone.mount({ element: '#thunderphone', apiKey: '...', agentId: 123 })

// Later, to remove the widget:
widget.unmount()
```

## License

MIT
