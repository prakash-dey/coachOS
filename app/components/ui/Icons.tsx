import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" {...props}>{children}</svg>;
}

export const PencilIcon = (props: IconProps) => <Icon {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></Icon>;
export const TrashIcon = (props: IconProps) => <Icon {...props}><path d="M3 6h18"/><path d="M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></Icon>;
export const CheckIcon = (props: IconProps) => <Icon {...props}><path d="m5 12 4 4L19 6"/></Icon>;
export const PlusIcon = (props: IconProps) => <Icon {...props}><path d="M12 5v14M5 12h14"/></Icon>;
export const XIcon = (props: IconProps) => <Icon {...props}><path d="m6 6 12 12M18 6 6 18"/></Icon>;
export const UserPlusIcon = (props: IconProps) => <Icon {...props}><path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></Icon>;
export const UnlinkIcon = (props: IconProps) => <Icon {...props}><path d="m18.8 5.2 1.4-1.4M2 2l20 20M6.2 6.2 4.9 7.5a4 4 0 0 0 5.6 5.6l1.4-1.4M12.1 16.3l1.4-1.4a4 4 0 0 0 .5-5"/></Icon>;
