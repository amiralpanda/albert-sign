import { createSigningApp } from './signing-app.js'

const port = Number(process.env.PORT || 4002)
createSigningApp().listen(port, () => {
  console.log(`Signing API http://localhost:${port}`)
})
