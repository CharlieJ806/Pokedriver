/** 宝可梦图标静态资源 URL(public/icons/,由 `npm run icons:gen` 从 data/pokemon-icons.json 生成)。 */
export function ICON(id: number | string): string {
  return `/icons/${id}.png`;
}
