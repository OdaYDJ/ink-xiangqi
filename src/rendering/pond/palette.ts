import { hex, type RGB } from './pixels'

/**
 * The V3 palette: deep ink green, jade and muted turquoise for the water;
 * warm wood, antique bronze and muted gold for the board; parchment, lotus
 * pink and cinnabar as accents. Saturation is kept low throughout.
 */
const r = (...c: string[]): RGB[] => c.map(hex)

/** The pond bed, deepest to shallowest. */
export const WATER = r('#071f1f', '#0b2a29', '#0f3533', '#13413d', '#184d47', '#1f5b52', '#28695d', '#347a69', '#458b75')
export const WATER_TINT = hex('#1b534b')
export const CAUSTIC = hex('#d2efcd')
export const GLINT = hex('#fff6dc')
export const RIPPLE = hex('#bfe4d4')
export const SHADOW = hex('#031514')

export const STONE = r('#1c2120', '#2b312f', '#3c4340', '#505753', '#666c66', '#7e837a', '#989a8f')
export const MOSS = r('#22371f', '#304a27', '#40602f', '#557639', '#6d8d44', '#8ea553')
export const GROUND = r('#101b14', '#16241a', '#1d2f20', '#253a26')
export const LEAF = r('#173a26', '#1f4b2e', '#2b6138', '#3c7a43', '#57944f', '#7eb064')
export const PAD = r('#163b27', '#1f4f30', '#2c663a', '#3f7e45', '#5a9852', '#82b46a')
export const BAMBOO = r('#1d3a1f', '#2a5028', '#3b6a31', '#54853c', '#76a04a', '#9cbc62')
export const LOTUS = r('#8e4a5e', '#b86a80', '#d990a2', '#ebb6c0', '#f6d9dc', '#fcefeb')
export const LOTUS_HEART = r('#b78a2e', '#dcb445', '#f0d470')
export const BLOSSOM = r('#b56b80', '#d9909f', '#efbcc4', '#fbe3e3')
export const BARK = r('#1c130e', '#2c1e15', '#3f2b1d')

export const WOOD = r('#170e09', '#231610', '#301e14', '#3d2719', '#4b3120', '#5b3c27', '#6e4a31')
export const BRONZE = r('#3d2d17', '#5c4524', '#7e6135', '#a4824a', '#c7a566', '#e2c88c', '#f4e3b5')
export const JADE = r('#1d4d3e', '#2f6f58', '#4f9479', '#86bca0')
export const LANTERN_GLOW = hex('#ffcf7a')

export const KOI = {
  white: hex('#efe9dc'),
  cream: hex('#e6dcc4'),
  red: hex('#c43a2a'),
  orange: hex('#e2742c'),
  gold: hex('#e3b24a'),
  black: hex('#1b1c1f'),
  slate: hex('#62748a'),
  eye: hex('#15100c'),
}
