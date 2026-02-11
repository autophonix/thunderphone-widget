import './style.css'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ThunderPhoneWidget } from './ThunderPhoneWidget'
import type { ThunderPhoneWidgetProps } from './types'

interface MountOptions extends Omit<ThunderPhoneWidgetProps, 'className'> {
  element: string | HTMLElement
  className?: string
}

interface MountHandle {
  unmount: () => void
  destroy: () => void
}

function mount(options: MountOptions): MountHandle {
  const { element, ...props } = options
  const container = typeof element === 'string' ? document.querySelector(element) : element
  if (!container) {
    throw new Error(`ThunderPhone: element "${element}" not found`)
  }

  const root: Root = createRoot(container)
  root.render(createElement(ThunderPhoneWidget, props))

  return {
    unmount: () => root.unmount(),
    destroy: () => root.unmount(),
  }
}

export { mount }
