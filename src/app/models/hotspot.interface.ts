export interface Hotspot {
    id: number;
    position: [number, number, number];
    title: string;
    description: string;
    meshName: string;
}

export interface ProjectedHotspot {
    id: number;
    title: string;
    description: string;
    position: [number, number];
}
