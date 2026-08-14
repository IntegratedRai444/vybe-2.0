import React, { ReactElement, Children, cloneElement } from "react";

export type PanelType =
  | "problems"
  | "outline"
  | "snippets"
  | "shortcuts"
  | "deploy"
  | "collaboration"
  | "ai";

interface PanelContainerProps {
  children: ReactElement<{ visible?: boolean; id?: PanelType }>[];
  activePanel: PanelType;
}

export const PanelContainer: React.FC<PanelContainerProps> = ({
  children,
  activePanel,
}) => {
  return (
    <div className="h-full">
      {Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;

        const isVisible = child.props.id === activePanel;
        return cloneElement(child, { visible: isVisible });
      })}
    </div>
  );
};

// Default export for backward compatibility
export const PanelContainer = PanelContainer;

// Named exports
export { PanelContainer };
export default PanelContainer;
