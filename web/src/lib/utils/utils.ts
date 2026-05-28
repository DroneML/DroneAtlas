export const slugFromPath = (path: string) => path.match(/([\w-]+)\.(svelte\.md|md|svx)/i)?.[1] ?? null

export const getOS = () => {
}

export const subString = (input: string, from: string, to: string) => {
  return input.slice(input.indexOf(from) + from.length, input.lastIndexOf(to))
}

export const timeago = (timestamp: string | number | Date, locale = "en") => {
}

export const formattedDate = (date: string | number | Date) => {
  return new Date(date).toLocaleDateString("en-UK", { dateStyle: "medium" })
}

export const slugify = (str: string) => {
}
