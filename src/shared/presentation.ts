/** Presentation-only contract; not a game save, World State, or narrative schema. */
export type Pose = 'stand' | 'lean' | 'turned' | 'near' | 'close' | 'back'
export interface ImageLayer { id: string; name: string; src?: string; pose?: Pose; position?: 'left' | 'center' | 'right' }
export interface SceneView {
  id: string
  background?: string
  cg?: { src?: string; title: string }
  characters: ImageLayer[]
  speaker?: string
  text: string
  choices?: { id: string; text: string; disabled?: boolean }[]
  effect?: 'fade' | 'shake' | 'flash'
}
