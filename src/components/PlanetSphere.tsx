import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

interface Planet {
  pl_name: string;
  pl_eqt?: number | null | undefined;
  pl_rade?: number | null | undefined;
  pl_insol?: number | null | undefined;
  st_teff?: number | null | undefined;
  discoverymethod?: string;
}

interface PlanetSphereProps {
  textureUrl?: string
  planet?: Planet
  size?: number
  className?: string
}

const PlanetSphere: React.FC<PlanetSphereProps> = ({ textureUrl, planet, size = 1, className }) => {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Ensure container has layout so canvas can size to it
    if (getComputedStyle(mount).position === 'static') {
      mount.style.position = 'relative'
    }

    const getSize = () => ({ width: Math.max(1, mount.clientWidth), height: Math.max(1, mount.clientHeight) })
    let { width, height } = getSize()

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.z = 2.5

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    // make sure canvas behaves responsively inside its container
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setClearColor(0x000000, 0) // Transparent background
    renderer.setSize(width, height, false)
    // append once
    if (mount && !mount.contains(renderer.domElement)) mount.appendChild(renderer.domElement)

  const geometry = new THREE.SphereGeometry(size, 64, 64)
    
    // Create material that will display textures properly
    const material = new THREE.MeshPhongMaterial({ 
      color: 0xffffff, // White base color to show true texture colors
      shininess: 30,
      transparent: false
    })
    
  const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Enhanced lighting for better texture visibility
    const light = new THREE.DirectionalLight(0xffffff, 1.0)
    light.position.set(5, 5, 5)
    scene.add(light)

    // Softer ambient light to show texture details
    const amb = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(amb)
    
    // Add subtle fill light from the side
    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3)
    fillLight.position.set(-3, 2, -2)
    scene.add(fillLight)

    // OrbitControls for interactive rotate/zoom
  const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.minDistance = 1.2
    controls.maxDistance = 10

    let userInteracting = false
    const onInteractionStart = () => { userInteracting = true }
    const onInteractionEnd = () => { userInteracting = false }
    controls.addEventListener('start', onInteractionStart)
    controls.addEventListener('end', onInteractionEnd)

    let frameId: number

    const animate = () => {
      // small auto-rotation when user not interacting
      if (!userInteracting) mesh.rotation.y += 0.002
      controls.update()
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    // load texture if provided - prioritize texture over default material
    if (textureUrl) {
      
      // Test if we can create an HTML image to verify the URL works
      // quick image probe for better logging and CORS detection
      const testImg = new Image()
      testImg.crossOrigin = 'anonymous'
  testImg.onload = () => {}
  testImg.onerror = () => console.warn(`Image URL failed: ${textureUrl}`)
      testImg.src = textureUrl

      const loader = new THREE.TextureLoader()
      // attempt promise-based load to simplify control flow
      ;(async () => {
        try {
          const tex = await (loader as any).loadAsync(textureUrl)
          ;(tex as any).encoding = (THREE as any).sRGBEncoding || (THREE as any).LinearEncoding
          ;(tex as any).minFilter = (THREE as any).LinearMipMapLinearFilter
          tex.needsUpdate = true
          material.map = tex
          material.color = new THREE.Color(0xffffff)
          material.needsUpdate = true
          // texture loaded successfully
        } catch (err) {
          console.warn(`❌ THREE.js texture loadAsync failed for ${textureUrl}, attempting fetch->blob fallback`, err)
          // fetch->blob fallback
          try {
            const r = await fetch(textureUrl, { mode: 'cors' })
            if (!r.ok) throw new Error(`Fetch failed: ${r.status}`)
            const blob = await r.blob()
            const objUrl = URL.createObjectURL(blob)
            try {
              const tex2 = await (loader as any).loadAsync(objUrl)
              ;(tex2 as any).encoding = (THREE as any).sRGBEncoding || (THREE as any).LinearEncoding
              ;(tex2 as any).minFilter = (THREE as any).LinearMipMapLinearFilter
              tex2.needsUpdate = true
              material.map = tex2
              material.color = new THREE.Color(0xffffff)
              material.needsUpdate = true
              // fallback blob texture applied
            } finally {
              setTimeout(() => { try { URL.revokeObjectURL(objUrl) } catch {} }, 5000)
            }
          } catch (fetchErr) {
            console.warn('Fetch fallback failed for texture', fetchErr)
            // Final color fallback
            const colors = [0x4466ff, 0xff6644, 0x44ff66, 0xff4466, 0x6644ff, 0x44ffff, 0xffaa44, 0xaa44ff]
            const key = planet?.pl_name || textureUrl || ''
            const hash = key.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)
            const colorIndex = Math.abs(hash) % colors.length
            material.map = null
            material.color = new THREE.Color(colors[colorIndex])
            material.needsUpdate = true
            // applied fallback color
          }
        }
      })()
    } else {
      // No texture URL provided to PlanetSphere, using default blue material
      // No texture provided, use default blue
      material.color = new THREE.Color(0x4466ff)
    }

    animate()


    // ResizeObserver for more reliable element size tracking (handles layout changes)
    const ro = new ResizeObserver(() => {
      const { width: w, height: h } = getSize()
      if (w === width && h === height) return
      width = w; height = h
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(window.devicePixelRatio || 1)
      renderer.setSize(w, h, false)
    })
    ro.observe(mount)

    return () => {
      cancelAnimationFrame(frameId)
      try { ro.disconnect() } catch {}
      controls.removeEventListener('start', onInteractionStart)
      controls.removeEventListener('end', onInteractionEnd)
      try { controls.dispose() } catch {}
      try { renderer.forceContextLoss(); renderer.dispose(); } catch {}
      try { geometry.dispose() } catch {}
      try { material.dispose() } catch {}
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        try { mount.removeChild(renderer.domElement) } catch {}
      }
    }
  }, [textureUrl, planet, size])

  return <div ref={mountRef} className={className || 'w-full h-36'} aria-hidden />
}

export default PlanetSphere
