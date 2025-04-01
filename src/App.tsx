import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

// テクスチャの定義
const textureLoader = new THREE.TextureLoader();
const textures = {
  dirt: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/dirt.png',
  grass: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/grass_top.png',
  stone: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/minecraft/stone.png',
};

function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 10, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    // Controls setup
    const controls = new PointerLockControls(camera, document.body);
    
    // Movement variables
    const moveSpeed = 0.15;
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let canJump = true;
    const PLAYER_HEIGHT = 1.8;

    // Key controls
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight = true;
          break;
        case 'Space':
          if (canJump) {
            velocity.y = 0.5;
            canJump = false;
          }
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight = false;
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Block placement and destruction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // コリジョン検出用の関数
    const checkCollision = (position: THREE.Vector3): boolean => {
      const playerBox = new THREE.Box3().setFromCenterAndSize(
        position,
        new THREE.Vector3(0.5, PLAYER_HEIGHT, 0.5)
      );

      for (const object of scene.children) {
        if (object instanceof THREE.Mesh) {
          const blockBox = new THREE.Box3().setFromObject(object);
          if (playerBox.intersectsBox(blockBox)) {
            return true;
          }
        }
      }
      return false;
    };

    const onClick = (event: MouseEvent) => {
      if (!isLocked) {
        controls.lock();
        return;
      }

      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children);

      if (intersects.length > 0) {
        const intersect = intersects[0];

        // 右クリック: ブロックを設置
        if (event.button === 2) {
          const voxelGeometry = new THREE.BoxGeometry(1, 1, 1);
          const voxelMaterial = new THREE.MeshStandardMaterial({
            map: textureLoader.load(textures.dirt),
          });
          const voxel = new THREE.Mesh(voxelGeometry, voxelMaterial);
          
          const position = new THREE.Vector3()
            .copy(intersect.point)
            .add(intersect.face!.normal)
            .floor()
            .addScalar(0.5);
          
          // プレイヤーの位置にブロックを置けないようにする
          const tempPosition = camera.position.clone();
          tempPosition.y -= PLAYER_HEIGHT / 2;
          const playerBox = new THREE.Box3().setFromCenterAndSize(
            tempPosition,
            new THREE.Vector3(0.5, PLAYER_HEIGHT, 0.5)
          );
          const blockBox = new THREE.Box3().setFromCenterAndSize(
            position,
            new THREE.Vector3(1, 1, 1)
          );
          
          if (!playerBox.intersectsBox(blockBox)) {
            voxel.position.copy(position);
            scene.add(voxel);
          }
        }
        // 左クリック: ブロックを破壊
        else if (event.button === 0) {
          const object = intersect.object;
          scene.remove(object);
        }
      }
    };

    // 地形生成
    const generateTerrain = () => {
      const size = 50;
      const heightMap = new Array(size * size).fill(0);
      
      // Simplex noiseの代わりに単純な正弦波で地形を生成
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const height = Math.floor(
            Math.sin(i * 0.2) * Math.cos(j * 0.2) * 5 + 5
          );
          heightMap[i + j * size] = height;
        }
      }

      // 地形の生成
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const height = heightMap[i + j * size];
          
          for (let h = 0; h < height; h++) {
            const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
            const blockMaterial = new THREE.MeshStandardMaterial({
              map: h === height - 1 
                ? textureLoader.load(textures.grass)
                : h > height - 3
                ? textureLoader.load(textures.dirt)
                : textureLoader.load(textures.stone),
            });
            
            const block = new THREE.Mesh(blockGeometry, blockMaterial);
            block.position.set(i - size/2, h, j - size/2);
            scene.add(block);
          }
        }
      }
    };

    generateTerrain();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Controls event listeners
    controls.addEventListener('lock', () => setIsLocked(true));
    controls.addEventListener('unlock', () => setIsLocked(false));

    document.addEventListener('click', onClick);
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (isLocked) {
        // Movement
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const prevPosition = camera.position.clone();

        velocity.x = direction.x * moveSpeed;
        velocity.z = direction.z * moveSpeed;

        // Gravity
        velocity.y -= 0.02;
        
        // 移動前の位置を保存
        const newPosition = camera.position.clone();
        
        // X軸の移動をチェック
        newPosition.x += velocity.x;
        if (!checkCollision(newPosition.clone().setY(newPosition.y - PLAYER_HEIGHT/2))) {
          controls.moveRight(velocity.x);
        }
        
        // Z軸の移動をチェック
        newPosition.copy(camera.position);
        newPosition.z -= velocity.z;
        if (!checkCollision(newPosition.clone().setY(newPosition.y - PLAYER_HEIGHT/2))) {
          controls.moveForward(-velocity.z);
        }
        
        // Y軸の移動（重力とジャンプ）
        camera.position.y += velocity.y;
        
        // 地面との衝突判定
        if (checkCollision(camera.position.clone().setY(camera.position.y - PLAYER_HEIGHT/2))) {
          camera.position.copy(prevPosition);
          velocity.y = 0;
          canJump = true;
        }
        
        // 最低高度を設定
        if (camera.position.y < PLAYER_HEIGHT) {
          camera.position.y = PLAYER_HEIGHT;
          velocity.y = 0;
          canJump = true;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('click', onClick);
      document.removeEventListener('contextmenu', (e) => e.preventDefault());
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [isLocked]);

  return (
    <>
      <div 
        ref={mountRef} 
        className="w-full h-screen"
        style={{ position: 'fixed', top: 0, left: 0 }}
      />
      {!isLocked && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
          <p className="text-2xl mb-4">マインクラフトクローン</p>
          <p>クリックしてスタート</p>
          <p className="mt-4 text-sm">
            移動: WASD / 矢印キー<br />
            ジャンプ: スペース<br />
            視点: マウス<br />
            ブロック設置: 右クリック<br />
            ブロック破壊: 左クリック<br />
            ESC: 一時停止
          </p>
        </div>
      )}
    </>
  );
}

export default App;