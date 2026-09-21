import { defineConfig } from 'vitepress'
import { withSidebar } from 'vitepress-sidebar'


// https://vitepress.dev/reference/site-config
const vitepressConfigs = {
  title: "Signal Processing Project",
  description: "Audio Waveform Generator and Analyzer",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    //nav: [
    //  { text: 'Home', link: '/' },
    //  { text: 'Examples', link: '/markdown-examples' }
    //],

    //sidebar: [
    //  {
    //    text: 'Examples',
    //    items: [
    //      { text: 'Markdown Examples', link: '/markdown-examples' },
    //      { text: 'Runtime API Examples', link: '/api-examples' }
    //    ]
    //  }
    //],
    cleanUrls: true,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sounddrill31/SignalWiki' }
    ]
  }
}

export default defineConfig(
  withSidebar(vitepressConfigs, {
    documentRootPath: '/docs',
    collapsed: false,
    sortMenusByFrontmatterOrder: true,
    frontmatterOrderDefaultValue: 0,
    useTitleFromFrontmatter: true,
    frontmatterTitleFieldName: 'sidebarTitle',
    includeFolderIndexFile: true,
    useTitleFromFileHeading: true,
  })
)

