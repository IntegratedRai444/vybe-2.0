import { Theme } from './theme';
import { CSSProperties } from 'react';

type ResponsiveValue<T> = T | Array<T | null> | { [key: string]: T };

interface StyleProps {
  // Layout
  m?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  mt?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  mr?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  mb?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  ml?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  mx?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  my?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  p?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  pt?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  pr?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  pb?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  pl?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  px?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  py?: ResponsiveValue<keyof Theme['spacing'] | string | number>;
  
  // Typography
  fontSize?: ResponsiveValue<keyof Theme['typography']['fontSize'] | string | number>;
  fontWeight?: ResponsiveValue<keyof Theme['typography']['fontWeight'] | string | number>;
  lineHeight?: ResponsiveValue<keyof Theme['typography']['lineHeight'] | string | number>;
  textAlign?: ResponsiveValue<CSSProperties['textAlign']>;
  fontStyle?: ResponsiveValue<CSSProperties['fontStyle']>;
  textTransform?: ResponsiveValue<CSSProperties['textTransform']>;
  letterSpacing?: ResponsiveValue<keyof Theme['typography']['letterSpacing'] | string>;
  
  // Colors
  color?: ResponsiveValue<keyof Theme['colors'] | string>;
  bg?: ResponsiveValue<keyof Theme['colors'] | string>;
  backgroundColor?: ResponsiveValue<keyof Theme['colors'] | string>;
  
  // Borders
  border?: ResponsiveValue<CSSProperties['border']>;
  borderTop?: ResponsiveValue<CSSProperties['borderTop']>;
  borderRight?: ResponsiveValue<CSSProperties['borderRight']>;
  borderBottom?: ResponsiveValue<CSSProperties['borderBottom']>;
  borderLeft?: ResponsiveValue<CSSProperties['borderLeft']>;
  borderColor?: ResponsiveValue<keyof Theme['colors'] | string>;
  borderRadius?: ResponsiveValue<keyof Theme['borderRadius'] | string | number>;
  
  // Layout
  width?: ResponsiveValue<CSSProperties['width']>;
  height?: ResponsiveValue<CSSProperties['height']>;
  minWidth?: ResponsiveValue<CSSProperties['minWidth']>;
  maxWidth?: ResponsiveValue<CSSProperties['maxWidth']>;
  minHeight?: ResponsiveValue<CSSProperties['minHeight']>;
  maxHeight?: ResponsiveValue<CSSProperties['maxHeight']>;
  
  // Flexbox
  flex?: ResponsiveValue<CSSProperties['flex']>;
  flexGrow?: ResponsiveValue<CSSProperties['flexGrow']>;
  flexShrink?: ResponsiveValue<CSSProperties['flexShrink']>;
  flexBasis?: ResponsiveValue<CSSProperties['flexBasis']>;
  flexDirection?: ResponsiveValue<CSSProperties['flexDirection']>;
  flexWrap?: ResponsiveValue<CSSProperties['flexWrap']>;
  justifyContent?: ResponsiveValue<CSSProperties['justifyContent']>;
  alignItems?: ResponsiveValue<CSSProperties['alignItems']>;
  alignContent?: ResponsiveValue<CSSProperties['alignContent']>;
  alignSelf?: ResponsiveValue<CSSProperties['alignSelf']>;
  
  // Grid
  gridTemplateColumns?: ResponsiveValue<CSSProperties['gridTemplateColumns']>;
  gridTemplateRows?: ResponsiveValue<CSSProperties['gridTemplateRows']>;
  gridTemplateAreas?: ResponsiveValue<CSSProperties['gridTemplateAreas']>;
  gridAutoColumns?: ResponsiveValue<CSSProperties['gridAutoColumns']>;
  gridAutoRows?: ResponsiveValue<CSSProperties['gridAutoRows']>;
  gridAutoFlow?: ResponsiveValue<CSSProperties['gridAutoFlow']>;
  gridColumnGap?: ResponsiveValue<CSSProperties['columnGap']>;
  gridRowGap?: ResponsiveValue<CSSProperties['rowGap']>;
  gridGap?: ResponsiveValue<CSSProperties['gap']>;
  
  // Position
  position?: ResponsiveValue<CSSProperties['position']>;
  top?: ResponsiveValue<CSSProperties['top']>;
  right?: ResponsiveValue<CSSProperties['right']>;
  bottom?: ResponsiveValue<CSSProperties['bottom']>;
  left?: ResponsiveValue<CSSProperties['left']>;
  zIndex?: ResponsiveValue<keyof Theme['zIndex'] | number>;
  
  // Misc
  display?: ResponsiveValue<CSSProperties['display']>;
  overflow?: ResponsiveValue<CSSProperties['overflow']>;
  overflowX?: ResponsiveValue<CSSProperties['overflowX']>;
  overflowY?: ResponsiveValue<CSSProperties['overflowY']>;
  boxShadow?: ResponsiveValue<keyof Theme['shadows'] | string>;
  opacity?: ResponsiveValue<CSSProperties['opacity']>;
  cursor?: ResponsiveValue<CSSProperties['cursor']>;
  transition?: ResponsiveValue<CSSProperties['transition']>;
  
  // Pseudo-classes
  '&:hover'?: Omit<StyleProps, '&:hover' | '&:focus' | '&:active'>;
  '&:focus'?: Omit<StyleProps, '&:hover' | '&:focus' | '&:active'>;
  '&:active'?: Omit<StyleProps, '&:hover' | '&:focus' | '&:active'>;
}

interface ThemeUtils {
  theme: Theme;
  breakpoints?: Record<string, string>;
}

const defaultBreakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

function getThemeValue<T = any>(
  path: string,
  theme: Theme,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let result: any = theme;
  
  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createStyleProps(
  props: StyleProps,
  { theme, breakpoints = defaultBreakpoints }: ThemeUtils
): CSSProperties {
  const style: Record<string, any> = {};
  
  // Process each prop
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    
    // Handle pseudo-classes
    if (key.startsWith('&:')) {
      continue; // Skip pseudo-classes for now
    }
    
    // Handle responsive values
    if (Array.isArray(value)) {
      // Handle array syntax for responsive values
      value.forEach((val, index) => {
        if (val == null) return;
        
        const breakpoint = Object.keys(breakpoints)[index];
        if (!breakpoint) return;
        
        const mediaQuery = `@media (min-width: ${breakpoints[breakpoint as keyof typeof breakpoints]})`;
        style[mediaQuery] = style[mediaQuery] || {};
        style[mediaQuery][key] = val;
      });
    } else if (isObject(value)) {
      // Handle object syntax for responsive values
      for (const [bp, val] of Object.entries(value)) {
        if (val == null) continue;
        
        if (bp in breakpoints) {
          const mediaQuery = `@media (min-width: ${breakpoints[bp as keyof typeof breakpoints]})`;
          style[mediaQuery] = style[mediaQuery] || {};
          style[mediaQuery][key] = val;
        } else if (bp === 'default') {
          style[key] = val;
        }
  };

  // Helper to get color value from theme
  const getColor = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      if (value.startsWith('$')) {
        return getThemeValue(value.substring(1).replace(/\./g, '.'));
      }
      // Check if it's a direct color reference
      const colorValue = getThemeValue(`colors.${value}`);
      return colorValue || value;
    }
    return value;
  };

  // Helper to get border radius from theme
  const getBorderRadius = (value: any): string | number | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string' || typeof value === 'number') {
      return getThemeValue(`borderRadius.${value}`, value);
    }
    return value;
  };

  // Helper to get box shadow from theme
  const getBoxShadow = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      return getThemeValue(`shadows.${value}`, value);
    }
    return value;
  };

  // Helper to get z-index from theme
  const getZIndex = (value: any): number | string | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'string') {
      return getThemeValue(`zIndex.${value}`, value);
    }
    return value;
  };

  // Helper to get transition from theme
  const getTransition = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      const duration = getThemeValue(`transition.duration.${value}`);
      const easing = getThemeValue('transition.easing.default', 'ease');
      return duration ? `all ${duration} ${easing}` : value;
    }
    return value;
  };

  // Build the style object with type safety
  const buildStyle = (props: StyleProps, isPseudo = false): CSSProperties => {
    const {
      // Layout
      m, mt, mr, mb, ml, mx, my,
      p, pt, pr, pb, pl, px, py,
      
      // Typography
      fontSize,
      fontWeight,
      lineHeight,
      textAlign,
      fontStyle,
      textTransform,
      letterSpacing,
      
      // Colors
      color,
      bg,
      backgroundColor,
      
      // Borders
      border,
      borderTop,
      borderRight,
      borderBottom,
      borderLeft,
      borderColor: borderColorProp,
      borderRadius,
      
      // Layout
      width,
      height,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      
      // Flexbox
      flex,
      flexGrow,
      flexShrink,
      flexBasis,
      flexDirection,
      flexWrap,
      justifyContent,
      alignItems,
      alignContent,
      alignSelf,
      
      // Grid
      gridTemplateColumns,
      gridTemplateRows,
      gridTemplateAreas,
      gridAutoColumns,
      gridAutoRows,
      gridAutoFlow,
      gridColumnGap,
      gridRowGap,
      gridGap,
      
      // Position
      position,
      top,
      right,
      bottom,
      left,
      zIndex,
      
      // Misc
      display,
      overflow,
      overflowX,
      overflowY,
      boxShadow,
      opacity,
      cursor,
      transition,
      
      // Pseudo-classes (only process in root level)
      ...restProps
    } = props;

    // Resolve colors
    const resolvedColor = resolveResponsiveValue(color, 'colors');
    const resolvedBg = resolveResponsiveValue(bg, 'colors');
    const resolvedBackgroundColor = resolveResponsiveValue(backgroundColor, 'colors');
    const resolvedBorderColor = resolveResponsiveValue(borderColorProp, 'colors');

    // Build the base style object
    const style: CSSProperties = {
      // Margin
      ...(m !== undefined && { margin: getSpacing(m) }),
      ...(mt !== undefined && { marginTop: getSpacing(mt) }),
      ...(mr !== undefined && { marginRight: getSpacing(mr) }),
      ...(mb !== undefined && { marginBottom: getSpacing(mb) }),
      ...(ml !== undefined && { marginLeft: getSpacing(ml) }),
      ...(mx !== undefined && { 
        marginLeft: getSpacing(mx),
        marginRight: getSpacing(mx),
      }),
      ...(my !== undefined && { 
        marginTop: getSpacing(my),
        marginBottom: getSpacing(my),
      }),
      
      // Padding
      ...(p !== undefined && { padding: getSpacing(p) }),
      ...(pt !== undefined && { paddingTop: getSpacing(pt) }),
      ...(pr !== undefined && { paddingRight: getSpacing(pr) }),
      ...(pb !== undefined && { paddingBottom: getSpacing(pb) }),
      ...(pl !== undefined && { paddingLeft: getSpacing(pl) }),
      ...(px !== undefined && { 
        paddingLeft: getSpacing(px),
        paddingRight: getSpacing(px),
      }),
      ...(py !== undefined && { 
        paddingTop: getSpacing(py),
        paddingBottom: getSpacing(py),
      }),
      
      // Typography
      ...(fontSize !== undefined && { 
        fontSize: resolveResponsiveValue(fontSize, 'typography.fontSize')
      }),
      ...(fontWeight !== undefined && { 
        fontWeight: resolveResponsiveValue(fontWeight, 'typography.fontWeight')
      }),
      ...(lineHeight !== undefined && { 
        lineHeight: resolveResponsiveValue(lineHeight, 'typography.lineHeight')
      }),
      ...(textAlign !== undefined && { textAlign }),
      ...(fontStyle !== undefined && { fontStyle }),
      ...(textTransform !== undefined && { textTransform }),
      ...(letterSpacing !== undefined && { 
        letterSpacing: resolveResponsiveValue(letterSpacing, 'typography.letterSpacing')
      }),
      
      // Colors
      ...(resolvedColor !== undefined && { color: resolvedColor }),
      ...(resolvedBg !== undefined && { backgroundColor: resolvedBg }),
      ...(resolvedBackgroundColor !== undefined && { backgroundColor: resolvedBackgroundColor }),
      
      // Borders
      ...(border !== undefined && { border }),
      ...(borderTop !== undefined && { borderTop }),
      ...(borderRight !== undefined && { borderRight }),
      ...(borderBottom !== undefined && { borderBottom }),
      ...(borderLeft !== undefined && { borderLeft }),
      ...(resolvedBorderColor !== undefined && { borderColor: resolvedBorderColor }),
      ...(borderRadius !== undefined && { borderRadius: getBorderRadius(borderRadius) }),
      
      // Layout
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
      ...(minWidth !== undefined && { minWidth }),
      ...(maxWidth !== undefined && { maxWidth }),
      ...(minHeight !== undefined && { minHeight }),
      ...(maxHeight !== undefined && { maxHeight }),
      
      // Flexbox
      ...(flex !== undefined && { flex }),
      ...(flexGrow !== undefined && { flexGrow }),
      ...(flexShrink !== undefined && { flexShrink }),
      ...(flexBasis !== undefined && { flexBasis }),
      ...(flexDirection !== undefined && { flexDirection }),
      ...(flexWrap !== undefined && { flexWrap }),
      ...(justifyContent !== undefined && { justifyContent }),
      ...(alignItems !== undefined && { alignItems }),
      ...(alignContent !== undefined && { alignContent }),
      ...(alignSelf !== undefined && { alignSelf }),
      
      // Grid
      ...(gridTemplateColumns !== undefined && { gridTemplateColumns }),
      ...(gridTemplateRows !== undefined && { gridTemplateRows }),
      ...(gridTemplateAreas !== undefined && { gridTemplateAreas }),
      ...(gridAutoColumns !== undefined && { gridAutoColumns }),
      ...(gridAutoRows !== undefined && { gridAutoRows }),
      ...(gridAutoFlow !== undefined && { gridAutoFlow }),
      ...(gridColumnGap !== undefined && { columnGap: getSpacing(gridColumnGap) }),
      ...(gridRowGap !== undefined && { rowGap: getSpacing(gridRowGap) }),
      ...(gridGap !== undefined && { gap: getSpacing(gridGap) }),
      
      // Position
      ...(position !== undefined && { position }),
      ...(top !== undefined && { top }),
      ...(right !== undefined && { right }),
      ...(bottom !== undefined && { bottom }),
      ...(left !== undefined && { left }),
      ...(zIndex !== undefined && { zIndex: getZIndex(zIndex) }),
      
      // Misc
      ...(display !== undefined && { display }),
      ...(overflow !== undefined && { overflow }),
      ...(overflowX !== undefined && { overflowX }),
      ...(overflowY !== undefined && { overflowY }),
      ...(boxShadow !== undefined && { boxShadow: getBoxShadow(boxShadow) }),
      ...(opacity !== undefined && { opacity }),
      ...(cursor !== undefined && { cursor }),
      ...(transition !== undefined && { transition: getTransition(transition) }),
      
      // Any other props
      ...restProps,
    };

    // Process pseudo-classes if this is the root level (not a pseudo-class itself)
    if (!isPseudo) {
      const pseudoStyles: Record<string, CSSProperties> = {};
      
      // Handle hover state
      if ('&:hover' in props) {
        pseudoStyles['&:hover'] = buildStyle(props['&:hover'] as StyleProps, true);
      }
      
      // Handle focus state
      if ('&:focus' in props) {
        pseudoStyles['&:focus'] = buildStyle(props['&:focus'] as StyleProps, true);
      }
      
      // Handle active state
      if ('&:active' in props) {
        pseudoStyles['&:active'] = buildStyle(props['&:active'] as StyleProps, true);
      }
      
      // Merge pseudo-class styles if any exist
      if (Object.keys(pseudoStyles).length > 0) {
        return {
          ...style,
          ...pseudoStyles,
        } as unknown as CSSProperties;
      }
    }
    
    return style;
  };

  return buildStyle(props);
};

// Example usage with TypeScript
interface StyledBoxProps extends StyleProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const StyledBox: React.FC<StyledBoxProps> = ({
  children,
  className,
  style: styleProp,
  ...props
}) => {
  const { theme } = useTheme();
  const style = createStyleProps(props, { theme });
  
  return (
    <div 
      className={className}
      style={{
        ...style,
        ...(styleProp || {}),
      }}
    >
      {children}
    </div>
  );
};

// Example usage with responsive values and pseudo-classes
/*
<StyledBox
  p={[2, 3, 4]} // Responsive padding: 2 on mobile, 3 on tablet, 4 on desktop
  m={2}
  bg="primary"
  color="white"
  hover={{
    bg: 'primaryDark',
    transform: 'translateY(-2px)',
    boxShadow: 'md',
  }}
  active={{
    transform: 'translateY(0)',
  }}
  focus={{
    outline: 'none',
    boxShadow: 'outline',
  }}
>
  Hover over me
</StyledBox>
*/
  color="white"
  borderRadius="md"
  boxShadow="md"
  transition="fast"
  hover={{
    bg: 'primaryDark',
    boxShadow: 'lg',
    transform: 'translateY(-2px)',
  }}
  focus={{
    outline: '2px solid',
    outlineColor: 'primaryLight',
  }}
>
  Hover over me!
</StyledBox>
*/
