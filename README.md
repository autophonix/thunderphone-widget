# ThunderPhone Widget

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
      publishableKey="pk_live_your_publishable_key"
    />
  )
}
```

## Setup

1. Log in to [app.thunderphone.com](https://app.thunderphone.com)
2. Go to **Developers** to create a publishable API key and configure allowed domains
3. Create a **Web Widget** and select the agent you want to expose
4. Use your publishable key in the widget code above

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `publishableKey` | `string` | Yes | Your publishable API key (`pk_live_...`). The agent is resolved from the key's configuration. |
| `apiBase` | `string` | No | API base URL (defaults to `https://api.thunderphone.com/v1`) |
| `onConnect` | `() => void` | No | Called when the voice session connects |
| `onDisconnect` | `() => void` | No | Called when the session ends |
| `onError` | `(error) => void` | No | Called on errors. Error has `error` (code) and `message` fields |
| `className` | `string` | No | Additional CSS class for the widget container |
| `ringtone` | `boolean \| string` | No | Play a ringtone while connecting. `true` for default, or a URL for custom audio. Disabled by default |

## Headless Hook

Use the `useThunderPhone` hook to build a completely custom UI while the widget handles the voice connection.

```tsx
import { useThunderPhone } from '@thunderphone/widget'

function CustomCallButton() {
  const phone = useThunderPhone({
    publishableKey: 'pk_live_your_publishable_key',
  })

  const handleClick = () => {
    if (phone.state === 'connected') {
      phone.disconnect()
    } else {
      phone.connect()
    }
  }

  return (
    <>
      <button onClick={handleClick} disabled={phone.state === 'connecting'}>
        {phone.state === 'connecting'
          ? 'Connecting...'
          : phone.state === 'connected'
            ? 'End call'
            : 'Start call'}
      </button>
      {phone.audio}
    </>
  )
}
```

**Important:** Always render `phone.audio` somewhere in your component tree. It's an invisible element that handles the audio connection.

### Hook Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `publishableKey` | `string` | Yes | Your publishable API key |
| `apiBase` | `string` | No | API base URL override |
| `onConnect` | `() => void` | No | Called when the voice session connects |
| `onDisconnect` | `() => void` | No | Called when the session ends |
| `onError` | `(error) => void` | No | Called on errors |
| `ringtone` | `boolean \| string` | No | Play a ringtone while connecting. `true` for default, or a URL for custom audio |

### Hook Return Value

| Property | Type | Description |
|----------|------|-------------|
| `state` | `'idle' \| 'connecting' \| 'connected' \| 'disconnected' \| 'error'` | Current connection state |
| `connect` | `() => void` | Start a voice session |
| `disconnect` | `() => void` | End the current session |
| `toggleMute` | `() => void` | Toggle microphone mute |
| `isMuted` | `boolean` | Whether the mic is muted |
| `error` | `string \| undefined` | Error message if state is `'error'` |
| `agentName` | `string \| undefined` | Name of the connected agent |
| `audio` | `ReactNode` | Invisible element — must be rendered in the tree |

## Ringtone

Play a ringing sound while the widget connects, to simulate a phone call:

```tsx
<ThunderPhoneWidget
  publishableKey="pk_live_your_publishable_key"
  ringtone={true}
/>
```

Use a custom audio file by passing a URL:

```tsx
<ThunderPhoneWidget
  publishableKey="pk_live_your_publishable_key"
  ringtone="https://example.com/my-ringtone.mp3"
/>
```

The ringtone loops during the `connecting` state and fades out when the agent connects. It is opt-in and disabled by default.

The headless hook accepts the same option:

```tsx
const phone = useThunderPhone({ publishableKey, ringtone: true })
```

And the script-tag mount API:

```js
ThunderPhone.mount({ element: '#thunderphone', publishableKey: '...', ringtone: true })
```

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
<link rel="stylesheet" href="https://cdn.thunderphone.com/widget/v0.4.0/style.css" />
<script src="https://cdn.thunderphone.com/widget/v0.4.0/widget.js"></script>

<div id="thunderphone"></div>

<script>
  ThunderPhone.mount({
    element: '#thunderphone',
    publishableKey: 'pk_live_your_publishable_key',
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
const widget = ThunderPhone.mount({ element: '#thunderphone', publishableKey: '...' })

// Later, to remove the widget:
widget.unmount()
```

## License

MIT
