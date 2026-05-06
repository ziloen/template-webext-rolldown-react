import Browser from 'webextension-polyfill'

function removePopup() {
  return Browser.action.setPopup({ popup: '' })
}

function setPopup() {
  return Browser.action.setPopup({ popup: './pages/popup/index.html' })
}

export function grantAllUrlPermission() {
  Browser.runtime.onInstalled.addListener(() => {
    Browser.permissions.contains({ origins: ['<all_urls>'] }).then((val) => {
      if (!val) {
        removePopup()
      }
    })
  })

  let permissionRequesting: Promise<any> | null = null
  Browser.action.onClicked.addListener((tab, info) => {
    if (permissionRequesting) return
    permissionRequesting = Browser.permissions
      .request({ origins: ['<all_urls>'] })
      .then((result) => {
        if (result) {
          Browser.action.getPopup({}).then((url) => {
            if (url) return
            setPopup()
          })
        } else {
          removePopup()
        }
      })
      .catch(removePopup)
      .finally(() => {
        permissionRequesting = null
      })

    Browser.action.openPopup()
  })

  Browser.permissions.onRemoved.addListener((permissions) => {
    if (permissions.origins?.includes('<all_urls>')) {
      removePopup()
    }
  })
}
