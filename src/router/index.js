import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PlaylistView from '@/views/PlaylistView.vue'
import VideolistView from '@/views/VideolistView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/playlist/:id',
      name: 'playlist',
      component: PlaylistView,
      props: true
    },
    {
      path: '/video',
      name: 'videos',
      component: VideolistView,
    },
    {
      path: '/video/playlist/:id',
      name: 'oneplaylist',
      component: VideolistView,
      props: true
    },
  ],
})

export default router
