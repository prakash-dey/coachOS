import Svg, { Path, Rect } from "react-native-svg";
import type { ColorValue } from "react-native";

/**
 * Ported 1:1 from `app/components/ui/Icons.tsx`'s SVG paths so the mobile
 * app uses the exact same iconography as web. Only the subset needed for
 * Milestone 0 navigation is included — add more by copying the matching
 * `<path>` data from the web file rather than sourcing a new icon set.
 *
 * `color` is typed as RN's `ColorValue` (not plain `string`) because
 * React Navigation's `tabBarIcon({ color })` callback hands back that
 * wider type.
 */

type IconProps = { size?: number; color?: ColorValue };

function Icon({ size = 20, color = "#1c1b1b", children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color as string} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export const DashboardIcon = (props: IconProps) => (
  <Icon {...props}>
    <Rect x="3" y="3" width="7" height="7" rx="1" />
    <Rect x="14" y="3" width="7" height="7" rx="1" />
    <Rect x="3" y="14" width="7" height="7" rx="1" />
    <Rect x="14" y="14" width="7" height="7" rx="1" />
  </Icon>
);

export const UsersIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Path d="M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    <Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

export const DumbbellIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
  </Icon>
);

export const LeafIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M12 22c5-3 8-7 8-12a8 8 0 0 0-16 0c0 5 3 9 8 12Z" />
    <Path d="M8 12c3 0 5-2 6-5M12 22V12" />
  </Icon>
);

export const ClipboardCheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <Rect x="3" y="5" width="18" height="16" rx="2" />
    <Path d="M16 3v4M8 3v4M3 11h18M9 16l2 2 4-4" />
  </Icon>
);

export const TrendingUpIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M3 3v18h18" />
    <Path d="m7 16 4-5 3 3 5-7" />
  </Icon>
);

export const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Icon>
);

export const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
    <Path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 1 1-4 0v-.09A1.8 1.8 0 0 0 8.75 19.3a1.8 1.8 0 0 0-1.98.36l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.8 1.8 0 0 0 4.3 15a1.8 1.8 0 0 0-1.65-1.1H2.5a2 2 0 1 1 0-4h.09A1.8 1.8 0 0 0 4.3 8.75a1.8 1.8 0 0 0-.36-1.98l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.8 1.8 0 0 0 8.75 4.3a1.8 1.8 0 0 0 1.1-1.65V2.5a2 2 0 1 1 4 0v.09a1.8 1.8 0 0 0 1.1 1.71 1.8 1.8 0 0 0 1.98-.36l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.8 1.8 0 0 0 19.4 8.75a1.8 1.8 0 0 0 1.65 1.1h.09a2 2 0 1 1 0 4h-.09A1.8 1.8 0 0 0 19.4 15Z" />
  </Icon>
);

export const LogoutIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
  </Icon>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M15 6l-6 6 6 6" />
  </Icon>
);

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <Rect x="3" y="5" width="18" height="16" rx="2" />
    <Path d="M16 3v4M8 3v4M3 11h18" />
  </Icon>
);

export const MoreIcon = (props: IconProps) => (
  <Icon {...props}>
    <Path d="M5 12a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" fill={props.color ?? "currentColor"} stroke="none" />
    <Path d="M12 12a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" fill={props.color ?? "currentColor"} stroke="none" />
    <Path d="M19 12a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" fill={props.color ?? "currentColor"} stroke="none" />
  </Icon>
);
