import { rcedit } from 'rcedit'

const [exePath, iconPath] = process.argv.slice(2)

if (!exePath || !iconPath) {
  throw new Error('Uso: node apply-icon.mjs <exePath> <iconPath>')
}

await rcedit(exePath, {
  icon: iconPath,
  'version-string': {
    CompanyName: 'Astedevv',
    FileDescription: 'ReciBox',
    ProductName: 'ReciBox',
    OriginalFilename: 'ReciBox.exe'
  }
})
