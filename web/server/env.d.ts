// ชนิดข้อมูลขั้นต่ำของ Cloudflare Pages Functions ที่ใช้ใน web/functions + web/server (ไม่ต้องติดตั้ง workers-types ทั้งชุด)
declare module '*.wasm' {
  const mod: WebAssembly.Module
  export default mod
}

interface HTMLRewriterElement {
  tagName: string
  setAttribute(name: string, value: string): HTMLRewriterElement
  setInnerContent(content: string, options?: { html?: boolean }): HTMLRewriterElement
  append(content: string, options?: { html?: boolean }): HTMLRewriterElement
}
declare class HTMLRewriter {
  on(selector: string, handlers: { element?(el: HTMLRewriterElement): void | Promise<void> }): HTMLRewriter
  transform(response: Response): Response
}
