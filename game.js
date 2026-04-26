// ===== THREE.JS INITIALIZATION =====
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 100, 200);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 20);
camera.lookAt(0, 5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
document.body.appendChild(renderer.domElement);

// ===== LIGHTING =====
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 50, 50);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.far = 500;
scene.add(sun);

// ===== GROUND =====
const groundGeometry = new THREE.PlaneGeometry(150, 150);
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5016 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ===== PLAYER CLASS =====
class Player {
  constructor() {
    this.health = 100;
    this.maxHealth = 100;
    this.mana = 50;
    this.maxMana = 50;
    this.level = 1;
    this.exp = 0;
    this.expToLevel = 100;
    this.attackPower = 15;
    this.defense = 5;
    this.moveSpeed = 0.25;
    this.lastAttackTime = 0;
    this.attackCooldown = 800;
    
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    
    // Create player mesh
    const geometry = new THREE.CapsuleGeometry(0.6, 2, 4, 8);
    const material = new THREE.MeshPhongMaterial({ color: 0x0066cc });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
    
    // Create weapon
    const weaponGeometry = new THREE.BoxGeometry(0.4, 2.5, 0.2);
    const weaponMaterial = new THREE.MeshPhongMaterial({ color: 0xccaa00 });
    this.weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    this.weapon.position.set(0.6, 0.5, 0);
    this.weapon.castShadow = true;
    this.mesh.add(this.weapon);
  }
  
  update(input, enemies) {
    // Movement
    const movement = input.getMovement();
    this.velocity.x = movement.x * this.moveSpeed;
    this.velocity.z = movement.y * this.moveSpeed;
    
    this.position.add(this.velocity);
    this.mesh.position.copy(this.position);
    
    // Boundary clamping
    this.position.x = Math.max(-70, Math.min(70, this.position.x));
    this.position.z = Math.max(-70, Math.min(70, this.position.z));
    
    // Attack
    if (input.isAttacking() && Date.now() - this.lastAttackTime > this.attackCooldown) {
      this.attack(enemies);
      this.lastAttackTime = Date.now();
    }
    
    // Mana regeneration
    if (this.mana < this.maxMana) {
      this.mana += 0.3;
    }
  }
  
  attack(enemies) {
    const attackRange = 4;
    enemies.forEach(enemy => {
      const distance = this.position.distanceTo(enemy.position);
      if (distance < attackRange) {
        const damage = this.attackPower + Math.random() * 8;
        enemy.takeDamage(damage);
      }
    });
  }
  
  takeDamage(amount) {
    const damageReduction = this.defense / 100;
    const actualDamage = amount * (1 - damageReduction);
    this.health = Math.max(0, this.health - actualDamage);
  }
  
  gainExp(amount) {
    this.exp += amount;
    if (this.exp >= this.expToLevel) {
      this.levelUp();
    }
  }
  
  levelUp() {
    this.level++;
    this.exp = 0;
    this.expToLevel = Math.floor(this.expToLevel * 1.3);
    this.maxHealth += 25;
    this.health = this.maxHealth;
    this.attackPower += 6;
    this.defense += 2;
    console.log(`Leveled up to ${this.level}!`);
  }
}

// ===== ENEMY CLASS =====
class Enemy {
  constructor() {
    this.health = 30;
    this.maxHealth = 30;
    this.attackPower = 6;
    this.defense = 2;
    this.moveSpeed = 0.12;
    this.attackRange = 3.5;
    this.chaseRange = 25;
    this.state = 'patrol';
    this.lastAttackTime = 0;
    this.attackCooldown = 1200;
    
    this.position = new THREE.Vector3(
      Math.random() * 80 - 40,
      0,
      Math.random() * 80 - 40
    );
    this.velocity = new THREE.Vector3(0, 0, 0);
    
    // Create enemy mesh
    const geometry = new THREE.OctahedronGeometry(0.8, 0);
    const material = new THREE.MeshPhongMaterial({ color: 0xff3333 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }
  
  update(player) {
    const distToPlayer = this.position.distanceTo(player.position);
    
    if (distToPlayer < this.chaseRange) {
      this.state = 'chase';
      this.chasePlayer(player);
      
      if (distToPlayer < this.attackRange) {
        this.attackPlayer(player);
      }
    } else {
      this.state = 'patrol';
      this.patrol();
    }
    
    this.position.add(this.velocity);
    this.mesh.position.copy(this.position);
  }
  
  chasePlayer(player) {
    const direction = new THREE.Vector3();
    direction.subVectors(player.position, this.position);
    direction.normalize();
    this.velocity.x = direction.x * this.moveSpeed;
    this.velocity.z = direction.z * this.moveSpeed;
  }
  
  patrol() {
    if (Math.random() < 0.01) {
      const angle = Math.random() * Math.PI * 2;
      this.velocity.x = Math.cos(angle) * this.moveSpeed * 0.6;
      this.velocity.z = Math.sin(angle) * this.moveSpeed * 0.6;
    }
  }
  
  attackPlayer(player) {
    if (Date.now() - this.lastAttackTime > this.attackCooldown) {
      const damage = this.attackPower + Math.random() * 4;
      player.takeDamage(damage);
      this.lastAttackTime = Date.now();
    }
  }
  
  takeDamage(amount) {
    const damageReduction = this.defense / 100;
    const actualDamage = amount * (1 - damageReduction);
    this.health = Math.max(0, this.health - actualDamage);
  }
  
  die() {
    scene.remove(this.mesh);
  }
}

// ===== INPUT MANAGER =====
class InputManager {
  constructor() {
    this.keys = {};
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchCurrentX = 0;
    this.touchCurrentY = 0;
    this.isTouching = false;
    this.attack = false;
    
    this.setupListeners();
  }
  
  setupListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    
    window.addEventListener('touchstart', (e) => {
      this.isTouching = true;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.touchCurrentX = this.touchStartX;
      this.touchCurrentY = this.touchStartY;
    });
    
    window.addEventListener('touchmove', (e) => {
      this.touchCurrentX = e.touches[0].clientX;
      this.touchCurrentY = e.touches[0].clientY;
    });
    
    window.addEventListener('touchend', (e) => {
      this.isTouching = false;
    });
    
    window.addEventListener('click', () => {
      this.attack = true;
    });
  }
  
  getMovement() {
    let x = 0, y = 0;
    
    if (this.keys['w'] || this.keys['arrowup']) y -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) y += 1;
    if (this.keys['a'] || this.keys['arrowleft']) x -= 1;
    if (this.keys['d'] || this.keys['arrowright']) x += 1;
    
    if (this.isTouching) {
      const deltaX = this.touchCurrentX - this.touchStartX;
      const deltaY = this.touchCurrentY - this.touchStartY;
      
      if (Math.abs(deltaX) > 30) x = deltaX > 0 ? 1 : -1;
      if (Math.abs(deltaY) > 30) y = deltaY > 0 ? 1 : -1;
    }
    
    const length = Math.sqrt(x * x + y * y);
    if (length > 0) {
      x /= length;
      y /= length;
    }
    
    return { x, y };
  }
  
  isAttacking() {
    const result = this.attack || this.keys[' '];
    this.attack = false;
    return result;
  }
}

// ===== GAME MANAGER =====
class GameManager {
  constructor() {
    this.player = new Player();
    this.enemies = [];
    this.input = new InputManager();
    this.gameOver = false;
    this.score = 0;
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = 2000;
    this.maxEnemies = 10;
    
    this.setupUI();
    this.gameLoop();
  }
  
  setupUI() {
    const uiDiv = document.createElement('div');
    uiDiv.id = 'hud';
    uiDiv.style.cssText = 'position: fixed; top: 20px; left: 20px; color: #0f0; font-family: monospace; font-size: 16px; background: rgba(0,0,0,0.7); padding: 15px; border-radius: 5px; z-index: 100;';
    this.uiDiv = uiDiv;
    document.body.appendChild(uiDiv);
  }
  
  spawnEnemy() {
    if (this.enemies.length < this.maxEnemies) {
      this.enemies.push(new Enemy());
    }
  }
  
  gameLoop = () => {
    requestAnimationFrame(this.gameLoop);
    
    if (!this.gameOver) {
      // Spawn enemies
      this.enemySpawnTimer++;
      if (this.enemySpawnTimer > this.enemySpawnInterval / 16) {
        this.spawnEnemy();
        this.enemySpawnTimer = 0;
      }
      
      // Update player
      this.player.update(this.input, this.enemies);
      
      // Update enemies
      this.enemies.forEach(enemy => {
        enemy.update(this.player);
      });
      
      // Check dead enemies
      this.enemies = this.enemies.filter(enemy => {
        if (enemy.health <= 0) {
          enemy.die();
          this.player.gainExp(25);
          this.score += 100;
          return false;
        }
        return true;
      });
      
      // Check player death
      if (this.player.health <= 0) {
        this.gameOver = true;
        console.log(`Game Over! Final Score: ${this.score}`);
      }
    }
    
    // Update HUD
    this.updateHUD();
    renderer.render(scene, camera);
  }
  
  updateHUD() {
    this.uiDiv.innerHTML = `
      <div><strong>ETERNAL SLIVER</strong></div>
      <div>─────────────────</div>
      <div>Level: ${this.player.level}</div>
      <div>HP: ${Math.ceil(this.player.health)}/${this.player.maxHealth}</div>
      <div>Mana: ${Math.ceil(this.player.mana)}/${this.player.maxMana}</div>
      <div>EXP: ${this.player.exp}/${this.player.expToLevel}</div>
      <div>─────────────────</div>
      <div>Enemies: ${this.enemies.length}</div>
      <div>Score: ${this.score}</div>
      ${this.gameOver ? '<div style="color: #f00;"><strong>GAME OVER</strong></div>' : ''}
    `;
  }
}

// ===== INITIALIZATION =====
window.addEventListener('load', () => {
  new GameManager();
});

// Handle window resize
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});
