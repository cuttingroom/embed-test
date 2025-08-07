export const messageTemplates = {
  openProject: {
    action: 'open_project',
    payload: {
      projectId: '<PROJECT UUID>'
    }
  },

  openSourceMedia: {
    action: 'open_asset',
    payload: {
      item: {
        title: 'My source media',
        contentType: 'video',
        source: {
          url: '<SOURCE MEDIA CRL>'
        }
      }
    }
  }
}

