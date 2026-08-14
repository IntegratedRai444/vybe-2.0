import * as React from "react"
import { Panel as ResizablePanel, PanelGroup as ResizablePanelGroup, PanelResizeHandle } from "react-resizable-panels"

const PanelContext = React.createContext({
  isCollapsed: false,
  toggleCollapse: () => {},
  isDragging: false,
})

export const PanelGroup = React.forwardRef(
  ({ children, className, ...props }, ref) => {
    return (
      <ResizablePanelGroup
        ref={ref}
        className={className}
        {...props}
      >
        {children}
      </ResizablePanelGroup>
    )
  }
)
PanelGroup.displayName = "PanelGroup"

export const Panel = React.forwardRef(
  ({ children, className, ...props }, ref) => {
    return (
      <ResizablePanel
        ref={ref}
        className={className}
        {...props}
      >
        {children}
      </ResizablePanel>
    )
  }
)
Panel.displayName = "Panel"

export { PanelResizeHandle }

export const PanelContainer = ({ children, className, ...props }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <PanelContext.Provider
      value={{
        isCollapsed,
        toggleCollapse,
        isDragging,
      }}
    >
      <div className={className} {...props}>
        {children}
      </div>
    </PanelContext.Provider>
  )
}

PanelContainer.displayName = "PanelContainer"

export const usePanel = () => {
  const context = React.useContext(PanelContext)
  if (!context) {
    throw new Error("usePanel must be used within a PanelContainer")
  }
  return context
}
