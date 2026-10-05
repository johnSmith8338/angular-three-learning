export interface Hotspot {
    id: number;
    title: string;
    description: string;
    meshName: string;
    anchor: HotspotAnchor;
}

export type HotspotAnchor = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
