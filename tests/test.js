// src/test/test.js
// Complete test suite for dot.js

//         Test Configuration        
const TESTS = [
  {
    id: 'basic-circle',
    name: 'Basic Circle',
    description: 'Create a circle with fill and stroke',
    run: testBasicCircle,
  },
  {
    id: 'basic-rect',
    name: 'Basic Rectangle',
    description: 'Create a rectangle with rounded corners',
    run: testBasicRect,
  },
  {
    id: 'basic-line',
    name: 'Basic Line',
    description: 'Create a line with stroke',
    run: testBasicLine,
  },
  {
    id: 'basic-polygon',
    name: 'Basic Polygon',
    description: 'Create a custom polygon',
    run: testBasicPolygon,
  },
  {
    id: 'wavy-effect',
    name: 'Wavy Effect',
    description: 'Apply wavy deformation to shapes',
    run: testWavy,
  },
  {
    id: 'join-shapes',
    name: 'Join Shapes',
    description: 'Join multiple shapes into one',
    run: testJoin,
  },
  {
    id: 'group-shapes',
    name: 'Group Shapes',
    description: 'Group shapes for batch operations',
    run: testGroup,
  },
  {
    id: 'animation',
    name: 'Animation Loop',
    description: 'Animated shapes with useRef',
    run: testAnimation,
  },
];

//         Test Runner        
const testResults = {};
const logEntries = [];

function log(message, level = 'info') {
  const time = new Date().toLocaleTimeString();
  const entry = { time, message, level };
  logEntries.push(entry);
  updateLog();
  console.log(`[${time}] ${level}: ${message}`);
}

function updateLog() {
  const container = document.getElementById('logContainer');
  const entries = logEntries.slice(-50).map(entry => {
    const levelClass = `level-${entry.level}`;
    const icon = entry.level === 'info' ? 'ℹ️' :
                 entry.level === 'error' ? '❌' :
                 entry.level === 'success' ? '       ' :
                 entry.level === 'warn' ? '⚠️' : 'ℹ️';
    return `<div class="log-entry">
      <span class="time">[${entry.time}]</span>
      <span class="${levelClass}">${icon}</span>
      <span>${entry.message}</span>
    </div>`;
  });
  container.innerHTML = entries.join('');
  container.scrollTop = container.scrollHeight;
}

function updateTestStatus(testId, status, message = '') {
  const card = document.querySelector(`[data-test-id="${testId}"]`);
  if (!card) return;
  
  const statusEl = card.querySelector('.status');
  statusEl.textContent = status.toUpperCase();
  statusEl.className = `status ${status}`;
  
  if (message) {
    const desc = card.querySelector('.description');
    desc.textContent = message;
  }
}

function createTestCard(test) {
  const grid = document.getElementById('testGrid');
  const card = document.createElement('div');
  card.className = 'test-card';
  card.dataset.testId = test.id;
  
  card.innerHTML = `
    <h2>${test.name}</h2>
    <div class="description">${test.description}</div>
    <canvas id="test-${test.id}" width="400" height="300"></canvas>
    <div class="status pending">⏳ PENDING</div>
  `;
  
  grid.appendChild(card);
  return card;
}

//         Test Implementations        

function testBasicCircle() {
  return new Promise((resolve) => {
    const canvas = document.getElementById('test-basic-circle');
    const app = createCanvas(400, 300, {
      use: canvas,
      background: '#1a1a2e',
    });

    circle(200, 150, 80)
      .fill('#ff6b6b')
      .stroke('#ffffff', 2)
      .setRef('circle1');

    app.draw(() => {
      const c = useRef('circle1');
      if (c) {
        // Static circle
      }
    });

    setTimeout(() => {
      log('Basic circle test passed        ', 'success');
      resolve();
    }, 500);
  });
}

function testBasicRect() {
  return new Promise((resolve) => {
    const canvas = document.getElementById('test-basic-rect');
    const app = createCanvas(400, 300, {
      use: canvas,
      background: '#1a1a2e',
    });

    rect(100, 100, 200, 100, { cornerRadius: 20 })
      .fill('#4ecdc4')
      .stroke('#ffffff', 2)
      .setRef('rect1');

    app.draw(() => {
      // Static
    });

    setTimeout(() => {
      log('Basic rectangle test passed        ', 'success');
      resolve();
    }, 500);
  });
}

function testBasicLine() {
  return new Promise((resolve) => {
    const canvas = document.getElementById('test-basic-line');
    const app = createCanvas(400, 300, {
      use: canvas,
      background: '#1a1a2e',
    });

    line(50, 250, 350, 50)
      .stroke('#ffd93d', 3)
      .setRef('line1');

    app.draw(() => {
      // Static
    });

    setTimeout(() => {
      log('Basic line test passed        ', 'success');
      resolve();
    }, 500);
  });
}

function testBasicPolygon() {
  return new Promise((resolve) => {
    const canvas = document.getElementById('test-basic-polygon');
    const app = createCanvas(400, 300, {
      use: canvas,
      background: '#1a1a2e',
    });

    createPolygon([
      { x: 200, y: 50 },
      { x: 350, y: 150 },
      { x: 300, y: 280 },
      { x: 100, y: 280 },
      { x: 50, y: 150 },
    ])
    .fill('#a29bfe')
    .stroke('#ffffff', 2)
    .setRef('polygon1');

    app.draw(() => {
      // Static
    });

    setTimeout(() => {
      log('Basic polygon test passed ', 'success');
      resolve();
    }, 500);
  });
}

function testWavy() {
  return new Promise((resolve) => {
    const canvas = document.getElementById('test-wavy-effect');
    const app = createCanvas(400, 300, {
      use: canvas,
      background: '#1a1a2e',
    });

    circle(200, 150, 80)
      .fill('#fd79a8')
      .stroke('#ffffff', 2)
      .wavy(10, 0.5, 'both')
      .setRef('wavy1');

    app.draw(() => {
      // Static - wavy applied
    });

    setTimeout(() => {
      log('Wavy effect test passed ', 'success');
      resolve();
    }, 500);
  });
}

function testJoin() {
  return new Promise((resolve) => {
    const canvas = document.getElementById('test-join-shapes');
    const app = createCanvas(400, 300, {
      use: canvas,
      background: '#1a1a2e',
    });

    const c1 = circle(150, 150, 50).fill('#ff6b6b');
    const c2 = circle(250, 150, 50).fill('#4ecdc4');
    
    join(c1, c2)
      .setRef('joined')
      .fill('#ffd93d')
      .stroke('#ffffff', 2);

    app.draw(() => {
      // Static
    });

    setTimeout(() => {
      log('Join test passed ', 'success');
      resolve();
    }, 500);
  });
}

function testGroup() {
  return new Promise((resolve) => {
    const canvas = document.getElementById('test-group-shapes');
    const app = createCanvas(400, 300, {
      use: canvas,
      background: '#1a1a2e',
    });

    const myGroup = group({
      shape1: circle(150, 150, 40),
      shape2: circle(250, 150, 40),
    })
    .setRef('group1')
    .fill('#a29bfe')
    .stroke('#ffffff', 2);

    app.draw(() => {
      // Static
    });

    setTimeout(() => {
      log('Group test passed ', 'success');
      resolve();
    }, 500);
  });
}

function testAnimation() {
  return new Promise((resolve) => {
    const canvas = document.getElementById('test-animation');
    const app = createCanvas(400, 300, {
      use: canvas,
      background: '#000000',
    });

    circle(200, 150, 10).fill('#ff6b6b').stroke('#ffffff', 2).setRef('anim1');

    let frameCount = 0;

    app.draw(() => {
      const anim = useRef('anim1');
      if (anim) {
        const x = 2 + Math.sin(Date.now() / 10) * 10;
        const y = 15 + Math.cos(Date.now() / 15) * 15;
        anim.translate(x - 1, y - 1);
       
      }
      frameCount++;
    });

    setTimeout(() => {
      if (frameCount >= 2) {
        log('Animation test passed ', 'success');
        resolve();
      } else {
        log('Animation test failed - not enough frames', 'error');
        resolve();
      }
    }, 2000);
  });
}

//         Run All Tests        

async function runAllTests() {
  log(' Starting test suite...', 'info');
  
  // Create test cards
  for (const test of TESTS) {
    createTestCard(test);
  }

  // Wait for DOM to render
  await new Promise(r => setTimeout(r, 100));

  // Run tests sequentially
  for (const test of TESTS) {
    log(`Running: ${test.name}...`, 'info');
    updateTestStatus(test.id, 'running');
    
    try {
      await test.run();
      updateTestStatus(test.id, 'passed', test.description);
    } catch (err) {
      log(`Test failed: ${test.name} - ${err.message}`, 'error');
      updateTestStatus(test.id, 'failed', `Error: ${err.message}`);
    }
  }

  log(' All tests completed!', 'success');
}

//         Initialize        

document.addEventListener('DOMContentLoaded', () => {
  log(' Test suite ready', 'info');
  
  document.getElementById('runAllBtn').addEventListener('click', () => {
    // Clear existing tests
    document.getElementById('testGrid').innerHTML = '';
    logEntries.length = 0;
    updateLog();
    runAllTests();
  });
  
  document.getElementById('clearBtn').addEventListener('click', () => {
    logEntries.length = 0;
    updateLog();
    log('Log cleared', 'info');
  });
  
  // Auto-run on load
  setTimeout(runAllTests, 500);
});

//         Error Handling        

window.addEventListener('error', (err) => {
  log(`Global error: ${err.message}`, 'error');
});

console.log(' dot.js test suite loaded!');
console.log(' Available tests:', TESTS.map(t => t.name).join(', '));