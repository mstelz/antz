const PLAYER_COUNT = 2;
const TABLEAU_ROWS = 4;
const TABLEAU_COLS = 4;
const HEADER_HEIGHT = 64;
const TEXT_STEP = 1;

const COLORS = {
  bgTop: 0xefe2b8,
  bgBottom: 0xd5bb7e,
  tableEdge: 0x4b311d,
  ink: '#2a1d14',
  brass: 0xc18b2f,
  cream: '#f9f2df',
  mossDark: 0x203826
};

const TILE_TYPES = [
  {
    key: 'food',
    label: 'Food Storage',
    color: 0xd1a943,
    detail: 'Bank food for upkeep and queen feeding.',
    cost: '1 leaf / 1 mud'
  },
  {
    key: 'nursery',
    label: 'Nursery',
    color: 0x98c5d8,
    detail: 'Raise eggs into fresh workers over time.',
    cost: '2 food'
  },
  {
    key: 'expansion',
    label: 'Expansion Chamber',
    color: 0xc59ecf,
    detail: 'Open more chamber slots and upgrade paths.',
    cost: '2 leaves / 1 mud'
  },
  {
    key: 'defense',
    label: 'Soldier Post',
    color: 0xca6956,
    detail: 'Blunt pesticides, spiders, and top-down danger.',
    cost: '1 food / 1 mud'
  }
];

const RESOURCE_TRACKS = [
  { key: 'food', label: 'Food', min: 0, max: 20, initial: 2 },
  { key: 'leaves', label: 'Leaves', min: 0, max: 20, initial: 1 },
  { key: 'materials', label: 'Mud', min: 0, max: 20, initial: 1 },
  { key: 'eggs', label: 'Eggs', min: 0, max: 10, initial: 0 },
  { key: 'threat', label: 'Threat', min: 0, max: 5, initial: 0 },
  { key: 'queen', label: 'Queen', min: 0, max: 5, initial: 3 }
];

const EVENT_DECK = [
  {
    name: 'Rain',
    badge: 'Flood',
    accent: 0x6d93c7,
    detail: 'Water climbs from the bottom. Each colony loses 1 food and gains 1 threat.',
    apply(scene) {
      scene.players.forEach((player, idx) => {
        scene.changeResource(idx, 'threat', 1);
        if (player.stats.food > 0) {
          scene.changeResource(idx, 'food', -1);
        }
      });
    }
  },
  {
    name: 'Drought',
    badge: 'Weather',
    accent: 0xd1a943,
    detail: 'The yard dries. Remove 1 threat and gain 1 leaf for each colony.',
    apply(scene) {
      scene.players.forEach((_, idx) => {
        scene.changeResource(idx, 'threat', -1);
        scene.changeResource(idx, 'leaves', 1);
      });
    }
  },
  {
    name: 'Pesticides',
    badge: 'Hazard',
    accent: 0xb96555,
    detail: 'Spray rolls in from above. Colonies without a Soldier Post lose 1 queen health.',
    apply(scene) {
      scene.players.forEach((_, idx) => {
        const hasDefense = scene.playerZones[idx].tileCounts.defense > 0;
        if (!hasDefense) {
          scene.changeResource(idx, 'queen', -1);
        }
        scene.changeResource(idx, 'threat', 1);
      });
    }
  },
  {
    name: 'Lawn Mower',
    badge: 'Noise',
    accent: 0x829a4a,
    detail: 'Open ground gets chopped up. Spend 1 mud or take 1 threat.',
    apply(scene) {
      scene.players.forEach((player, idx) => {
        if (player.stats.materials > 0) {
          scene.changeResource(idx, 'materials', -1);
        } else {
          scene.changeResource(idx, 'threat', 1);
        }
      });
    }
  },
  {
    name: 'Spider',
    badge: 'Predator',
    accent: 0x594652,
    detail: 'A hunter enters the garden. Colonies without a Soldier Post gain 1 threat.',
    apply(scene) {
      scene.players.forEach((_, idx) => {
        const hasDefense = scene.playerZones[idx].tileCounts.defense > 0;
        if (!hasDefense) {
          scene.changeResource(idx, 'threat', 1);
        }
      });
    }
  }
];

class PrototypeScene extends Phaser.Scene {
  constructor() {
    super('prototype');
    this.playerZones = [];
    this.tileSupply = [];
    this.players = [];
    this.layout = null;
    this.metrics = null;
    this.supplyBounds = null;
    this.forageTokens = [];
    this.eventDeck = [];
    this.discardPile = [];
    this.eventUI = {};
    this.sectionContainers = {};
    this.uiState = {
      boardVisible: true,
      deckVisible: false,
      supplyVisible: false
    };
    this.focusOverlay = null;
    this.headerSummary = null;
    this.activeColony = 0;
  }

  create() {
    this.players = this.createPlayers();
    this.eventDeck = Phaser.Utils.Array.Shuffle([...EVENT_DECK]);
    this.discardPile = [];
    this.layout = this.calculateLayout();
    this.metrics = this.calculateMetrics();

    this.createBackground();
    this.createHeader();
    this.createSharedBoard();
    this.createEventArea();
    this.createSupplyArea();
    this.createPlayerTableaus();
    this.createFocusOverlay();
    this.updateHeaderSummary();
    this.applySectionVisibility();
    this.registerInput();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
  }

  handleResize() {
    this.scene.restart();
  }

  createPlayers() {
    return Array.from({ length: PLAYER_COUNT }, (_, index) => ({
      index,
      name: `Colony ${index + 1}`,
      stats: RESOURCE_TRACKS.reduce((acc, track) => {
        acc[track.key] = track.initial || 0;
        return acc;
      }, {})
    }));
  }

  calculateLayout() {
    const width = this.scale.width;
    const height = this.scale.height;
    const margin = Math.max(12, Math.min(24, Math.floor(width * 0.015)));
    const top = HEADER_HEIGHT + margin;
    const usableHeight = height - top - margin;
    const topHeight = Math.max(230, Math.min(usableHeight * 0.36, 320));
    const bottomHeight = Math.max(250, usableHeight - topHeight - margin);
    const focusWidth = width - margin * 2;

    return {
      margin,
      header: { x: margin, y: margin, width: width - margin * 2, height: HEADER_HEIGHT },
      board: { x: margin, y: top, width: focusWidth, height: topHeight },
      event: { x: margin, y: top, width: focusWidth, height: topHeight },
      supply: { x: margin, y: top, width: focusWidth, height: topHeight },
      tableaus: { x: margin, y: top + topHeight + margin, width: width - margin * 2, height: bottomHeight }
    };
  }

  calculateMetrics() {
    const tableaus = this.layout.tableaus;
    const matWidth = tableaus.width;
    const matHeight = tableaus.height;
    const panelWidth = Phaser.Math.Clamp(matWidth * 0.22, 170, 260);
    const summaryHeight = 40;
    const matPadding = 14;
    const availableGridWidth = matWidth - panelWidth - matPadding * 4;
    const availableGridHeight = matHeight - matPadding * 2 - summaryHeight - 28;
    const tileSize = Math.max(46, Math.min(availableGridWidth / TABLEAU_COLS - 6, availableGridHeight / TABLEAU_ROWS - 6, 88));
    const gridGap = Math.max(8, tileSize * 0.08);
    const gridPadding = 12;

    return {
      matWidth,
      matHeight,
      panelWidth,
      summaryHeight,
      matPadding,
      tileSize,
      tableauCardWidth: tileSize * 0.92,
      tableauCardHeight: tileSize * 1.12,
      gridGap,
      gridPadding
    };
  }

  fitTextToBox(textObject, content, maxWidth, maxHeight, maxFontSize, minFontSize) {
    textObject.setWordWrapWidth(maxWidth);
    textObject.setText(content);

    for (let size = Math.floor(maxFontSize); size >= minFontSize; size -= TEXT_STEP) {
      textObject.setFontSize(size);
      if (textObject.height <= maxHeight && textObject.width <= maxWidth) {
        return;
      }
    }

    textObject.setFontSize(minFontSize);
    const words = content.split(' ');
    let fitted = content;
    while (words.length > 1) {
      words.pop();
      fitted = `${words.join(' ')}…`;
      textObject.setText(fitted);
      if (textObject.height <= maxHeight && textObject.width <= maxWidth) {
        return;
      }
    }

    textObject.setText(fitted);
  }

  createBackground() {
    const { width, height } = this.scale;
    const table = this.add.rectangle(width / 2, height / 2, width, height, 0xd5bb7e, 1);
    const glow = this.add.rectangle(width / 2, height * 0.42, width * 1.1, height * 0.7, 0xefe2b8, 0.45);
    const rim = this.add.rectangle(width / 2, height / 2, width - 10, height - 10, 0x5d4326, 0.25);
    table.setDepth(-20);
    glow.setDepth(-19);
    rim.setStrokeStyle(6, 0x4b311d, 0.5);
    rim.setDepth(-18);
  }

  createHeader() {
    const area = this.layout.header;
    const header = this.add.rectangle(area.x + area.width / 2, area.y + area.height / 2, area.width, area.height, 0x2f241b, 0.82);
    header.setStrokeStyle(2, COLORS.brass, 0.9);

    this.add.text(area.x + 18, area.y + 10, 'ANTZ: Backyard Colony Prototype', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: COLORS.cream,
      fontStyle: 'bold'
    });
    this.add.text(area.x + 18, area.y + 38, 'Threat cards, colony mats, and a shared foraging board laid out like a tabletop build.', {
      fontFamily: 'Georgia',
      fontSize: '15px',
      color: '#e7d9b3'
    });

    this.headerSummary = this.add.text(area.x + area.width - 390, area.y + 14, '', {
      fontFamily: 'Georgia',
      fontSize: '13px',
      color: '#f0e3c5',
      align: 'right'
    });

    const summaryWidth = 190;
    this.headerSummary.setPosition(area.x + area.width - summaryWidth - 16, area.y + 12);
    this.headerSummary.setWordWrapWidth(summaryWidth);

    const controls = [
      { key: 'boardVisible', label: 'Board' },
      { key: 'deckVisible', label: 'Deck' },
      { key: 'supplyVisible', label: 'Supply' }
    ];
    const controlButtonWidth = 72;
    const controlGap = 10;
    const controlsStartX = area.x + area.width - (controls.length * controlButtonWidth + (controls.length - 1) * controlGap) - 16;
    const controlsY = area.y + 50;

    controls.forEach((control) => {
      const x = controlsStartX + controls.indexOf(control) * (controlButtonWidth + controlGap) + controlButtonWidth / 2;
      const button = this.add.rectangle(x, controlsY, controlButtonWidth, 24, 0x4a3527, 0.95);
      button.setStrokeStyle(1, 0xd9c092, 0.8);
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.toggleSection(control.key));
      const text = this.add.text(x, controlsY - 7, control.label, {
        fontFamily: 'Trebuchet MS',
        fontSize: '12px',
        color: '#fff4dd',
        fontStyle: 'bold'
      }).setOrigin(0.5, 0);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.toggleSection(control.key));
      this.sectionContainers[`${control.key}Button`] = { button, text };
    });

    this.sectionContainers.colonyButtons = [];
    const colonyButtonWidth = 98;
    const colonyGap = 12;
    const colonyTotalWidth = this.players.length * colonyButtonWidth + (this.players.length - 1) * colonyGap;
    const colonyLeftBound = area.x + 320;
    const colonyRightBound = controlsStartX - 18;
    const colonyFirstCenter = colonyLeftBound + colonyButtonWidth / 2 + Math.max(0, (colonyRightBound - colonyLeftBound - colonyTotalWidth) / 2);
    this.players.forEach((player, index) => {
      const x = colonyFirstCenter + index * (colonyButtonWidth + colonyGap);
      const button = this.add.rectangle(x, controlsY, colonyButtonWidth, 24, 0x4a3527, 0.95);
      button.setStrokeStyle(1, 0xd9c092, 0.8);
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.setActiveColony(index));
      const text = this.add.text(x, controlsY - 7, player.name, {
        fontFamily: 'Trebuchet MS',
        fontSize: '12px',
        color: '#fff4dd',
        fontStyle: 'bold'
      }).setOrigin(0.5, 0);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.setActiveColony(index));
      this.sectionContainers.colonyButtons.push({ button, text });
    });
  }

  updateHeaderSummary() {
    if (!this.headerSummary) {
      return;
    }

    const currentEvent = this.discardPile[this.discardPile.length - 1];
    this.headerSummary.setText([
      `Deck ${this.eventDeck.length}  Discard ${this.discardPile.length}`,
      `Current threat: ${currentEvent ? currentEvent.name : 'none'}`
    ].join('\n'));
  }

  toggleSection(key) {
    const nextValue = !this.uiState[key];
    Object.keys(this.uiState).forEach((uiKey) => {
      this.uiState[uiKey] = false;
    });
    this.uiState[key] = nextValue;
    this.applySectionVisibility();
  }

  applySectionVisibility() {
    const sections = [
      { key: 'boardVisible', container: this.sectionContainers.board },
      { key: 'deckVisible', container: this.sectionContainers.deck },
      { key: 'supplyVisible', container: this.sectionContainers.supply }
    ];

    sections.forEach(({ key, container }) => {
      if (container) {
        this.setContainerVisibility(container, this.uiState[key]);
      }
      const buttonUI = this.sectionContainers[`${key}Button`];
      if (buttonUI) {
        buttonUI.button.fillColor = this.uiState[key] ? 0x8a6138 : 0x4a3527;
      }
    });

    if (this.sectionContainers.colonyButtons) {
      this.sectionContainers.colonyButtons.forEach((entry, index) => {
        entry.button.fillColor = index === this.activeColony ? 0x8a6138 : 0x4a3527;
      });
    }
  }

  setContainerVisibility(container, shouldShow) {
    if (!container) {
      return;
    }

    this.tweens.killTweensOf(container);
    if (shouldShow) {
      container.setVisible(true);
      container.y = 0;
      container.alpha = 0;
      this.tweens.add({
        targets: container,
        alpha: 1,
        duration: 180,
        ease: 'Sine.Out'
      });
      return;
    }

    if (!container.visible) {
      return;
    }

    this.tweens.add({
      targets: container,
      alpha: 0,
      y: -8,
      duration: 140,
      ease: 'Sine.In',
      onComplete: () => {
        container.setVisible(false);
        container.alpha = 1;
        container.y = 0;
      }
    });
  }

  setActiveColony(index) {
    this.activeColony = index;
    this.playerZones.forEach((zone, zoneIndex) => {
      this.setContainerVisibility(zone.container, zoneIndex === this.activeColony);
    });
    this.applySectionVisibility();
  }

  createSharedBoard() {
    const area = this.layout.board;
    const section = this.add.container(0, 0);
    this.sectionContainers.board = section;
    const frame = this.add.rectangle(area.x + area.width / 2, area.y + area.height / 2, area.width, area.height, COLORS.mossDark, 0.9);
    frame.setStrokeStyle(3, 0xb4d183, 0.9);
    section.add(frame);

    section.add(this.add.text(area.x + 14, area.y + 12, 'Backyard Foraging Board', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#edf7d0',
      fontStyle: 'bold'
    }));
    section.add(this.add.text(area.x + 14, area.y + 38, 'Workers branch out from the nest. Trails matter for access and danger, but the stops are the real decisions.', {
      fontFamily: 'Georgia',
      fontSize: '13px',
      color: '#d7e8bd'
    }));

    const centerX = area.x + area.width * 0.5;
    const centerY = area.y + area.height * 0.58;
    const nest = this.add.circle(centerX, centerY, 36, 0xd1a943, 0.98);
    nest.setStrokeStyle(4, 0x24180f, 0.9);
    nest.setInteractive({ useHandCursor: true });
    nest.on('pointerdown', () => this.spawnForageToken(centerX, centerY));
    section.add(nest);
    section.add(this.add.text(centerX, centerY - 8, 'Nest', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#fff7e6',
      fontStyle: 'bold'
    }).setOrigin(0.5));
    section.add(this.add.text(centerX, centerY + 14, 'Start', {
      fontFamily: 'Georgia',
      fontSize: '12px',
      color: '#fff2df'
    }).setOrigin(0.5));

    const branches = [
      {
        label: 'Flower Bed',
        subtitle: 'high food / exposure',
        color: 0x8a5138,
        spaces: [
          { x: area.x + area.width * 0.58, y: area.y + area.height * 0.51, type: 'trail' },
          { x: area.x + area.width * 0.67, y: area.y + area.height * 0.42, type: 'trail' },
          { x: area.x + area.width * 0.81, y: area.y + area.height * 0.31, type: 'goal' }
        ]
      },
      {
        label: 'Grass Patch',
        subtitle: 'steady food',
        color: 0x4f7e36,
        spaces: [
          { x: area.x + area.width * 0.52, y: area.y + area.height * 0.44, type: 'trail' },
          { x: area.x + area.width * 0.51, y: area.y + area.height * 0.27, type: 'goal' }
        ]
      },
      {
        label: 'Compost Heap',
        subtitle: 'mud / build',
        color: 0x5d4024,
        spaces: [
          { x: area.x + area.width * 0.41, y: area.y + area.height * 0.48, type: 'trail' },
          { x: area.x + area.width * 0.26, y: area.y + area.height * 0.34, type: 'goal' }
        ]
      },
      {
        label: 'Bird Bath',
        subtitle: 'water / flood risk',
        color: 0x4b7d91,
        spaces: [
          { x: area.x + area.width * 0.59, y: area.y + area.height * 0.66, type: 'trail' },
          { x: area.x + area.width * 0.69, y: area.y + area.height * 0.73, type: 'trail' },
          { x: area.x + area.width * 0.82, y: area.y + area.height * 0.79, type: 'goal' }
        ]
      },
      {
        label: 'Predator Lane',
        subtitle: 'fight / threat',
        color: 0xb96555,
        spaces: [
          { x: area.x + area.width * 0.39, y: area.y + area.height * 0.69, type: 'trail' },
          { x: area.x + area.width * 0.24, y: area.y + area.height * 0.79, type: 'goal' }
        ]
      }
    ];

    branches.forEach((branch) => {
      const trail = this.add.graphics();
      trail.lineStyle(8, 0xe6cf98, 0.6);
      trail.beginPath();
      trail.moveTo(centerX, centerY);
      branch.spaces.forEach((space) => {
        trail.lineTo(space.x, space.y);
      });
      trail.strokePath();
      section.add(trail);

      branch.spaces.forEach((space, index) => {
        const isGoal = space.type === 'goal';
        const radius = isGoal ? 24 : 15;
        const alpha = isGoal ? 0.98 : 0.82;
        const node = this.add.circle(space.x, space.y, radius, branch.color, alpha);
        node.setStrokeStyle(isGoal ? 3 : 2, 0x24180f, 0.9);
        node.setInteractive({ useHandCursor: true });
        node.on('pointerdown', () => this.spawnForageToken(space.x, space.y));
        section.add(node);
        if (!isGoal) {
          section.add(this.add.text(space.x, space.y - 6, `${index + 1}`, {
            fontFamily: 'Trebuchet MS',
            fontSize: '12px',
            color: '#fff6ea',
            fontStyle: 'bold'
          }).setOrigin(0.5));
        }
      });

      const goal = branch.spaces[branch.spaces.length - 1];
      const plate = this.add.rectangle(goal.x, goal.y, 170, 60, branch.color, 0.92);
      plate.setStrokeStyle(2, 0xffffff, 0.18);
      section.add(plate);
      section.add(this.add.text(goal.x - 74, goal.y - 15, branch.label, {
        fontFamily: 'Trebuchet MS',
        fontSize: '16px',
        color: '#fff3df',
        fontStyle: 'bold',
        wordWrap: { width: 144 }
      }));
      section.add(this.add.text(goal.x - 74, goal.y + 9, branch.subtitle, {
        fontFamily: 'Georgia',
        fontSize: '12px',
        color: '#fff8ea',
        wordWrap: { width: 144 }
      }));
    });

    section.add(this.add.text(area.x + 14, area.y + area.height - 22, 'Treat trails like access cost: they gate how far workers can push before hazards, not the main attraction themselves.', {
      fontFamily: 'Georgia',
      fontSize: '12px',
      color: '#e4efcf'
    }));
  }

  spawnForageToken(x, y) {
    const playerIndex = this.forageTokens.length % PLAYER_COUNT;
    const colors = [0xf5de76, 0x78c7f0, 0xf4986c, 0xc9a4e8];
    const token = this.add.circle(x, y, 11, colors[playerIndex % colors.length], 0.95);
    token.setStrokeStyle(2, 0x2b1a10, 0.9);
    token.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(token);
    if (this.sectionContainers.board) {
      this.sectionContainers.board.add(token);
    }
    this.forageTokens.push(token);
  }

  createEventArea() {
    const area = this.layout.event;
    const section = this.add.container(0, 0);
    this.sectionContainers.deck = section;
    const panel = this.add.rectangle(area.x + area.width / 2, area.y + area.height / 2, area.width, area.height, 0x332820, 0.9);
    panel.setStrokeStyle(2, COLORS.brass, 0.8);
    section.add(panel);

    section.add(this.add.text(area.x + 14, area.y + 12, 'Threat Deck', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#fff0cf',
      fontStyle: 'bold'
    }));
    section.add(this.add.text(area.x + 14, area.y + 38, 'Click the deck to reveal the next event card.', {
      fontFamily: 'Georgia',
      fontSize: '13px',
      color: '#e1d4bf'
    }));

    const cardWidth = Math.min(210, area.width * 0.22);
    const cardHeight = area.height - 82;
    const deckX = area.x + area.width * 0.28;
    const cardY = area.y + area.height * 0.56;

    const deckShadow = this.add.rectangle(deckX + 6, cardY + 6, cardWidth, cardHeight, 0x000000, 0.18);
    const deckCard = this.add.rectangle(deckX, cardY, cardWidth, cardHeight, 0xefe5cf, 0.98);
    deckCard.setStrokeStyle(3, 0x291c14, 0.9);
    deckCard.setInteractive({ useHandCursor: true });
    deckCard.on('pointerdown', () => this.drawEventCard());
    section.add([deckShadow, deckCard]);

    section.add(this.add.text(deckX, cardY - 20, 'DRAW', {
      fontFamily: 'Trebuchet MS',
      fontSize: '26px',
      color: COLORS.ink,
      fontStyle: 'bold'
    }).setOrigin(0.5));
    section.add(this.add.text(deckX, cardY + 16, 'Threat card', {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: COLORS.ink
    }).setOrigin(0.5));

    const revealX = area.x + area.width * 0.73;
    const reveal = this.createEventCard(revealX, cardY, cardWidth, cardHeight);
    section.add(reveal);
    const pileText = this.add.text(area.x + 18, area.y + area.height - 20, '', {
      fontFamily: 'Georgia',
      fontSize: '13px',
      color: '#f2e9d9'
    });
    section.add(pileText);
    section.add(this.add.text(area.x + area.width * 0.5, area.y + 88, 'Draw into the reveal slot, inspect the threat, then hide this section when you go back to colony planning.', {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: '#f2e9d9',
      wordWrap: { width: area.width - 60 }
    }).setOrigin(0.5));

    this.eventUI = { reveal, pileText };

    deckShadow.setDepth(1);
    deckCard.setDepth(2);
    this.refreshEventCounts();
  }

  createEventCard(x, y, width, height) {
    const container = this.add.container(x, y);
    container.setSize(width, height);
    const base = this.add.rectangle(0, 0, width, height, 0xf6edd8, 1);
    base.setStrokeStyle(3, 0x23170f, 0.9);
    const accent = this.add.rectangle(0, -height / 2 + 18, width - 20, 26, 0x7b5c46, 1);
    const badge = this.add.text(-width / 2 + 14, -height / 2 + 7, 'READY', {
      fontFamily: 'Trebuchet MS',
      fontSize: '12px',
      color: '#fff8ec',
      fontStyle: 'bold'
    });
    const title = this.add.text(-width / 2 + 14, -height / 2 + 42, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: COLORS.ink,
      fontStyle: 'bold',
      wordWrap: { width: width - 28 }
    });
    const body = this.add.text(-width / 2 + 14, -height / 2 + 82, '', {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: COLORS.ink,
      wordWrap: { width: width - 28 }
    });
    const footer = this.add.text(-width / 2 + 14, height / 2 - 28, '', {
      fontFamily: 'Georgia',
      fontSize: '12px',
      color: '#6b5746',
      wordWrap: { width: width - 28 }
    });

    this.fitTextToBox(title, 'No event drawn', width - 28, 34, 22, 15);
    this.fitTextToBox(body, 'The current threat will appear here after you draw from the deck.', width - 28, height - 138, 14, 11);
    this.fitTextToBox(footer, 'Discard pile waits beside the deck.', width - 28, 18, 12, 10);

    container.add([base, accent, badge, title, body, footer]);
    container.setData('parts', { accent, badge, title, body, footer, bodyHeight: height - 138 });
    container.setData('focusData', {
      title: 'Threat Deck',
      subtitle: 'Current event',
      body: 'The current threat will appear here after you draw from the deck.'
    });
    container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
    container.on('pointerdown', () => this.openFocusOverlay(container.getData('focusData')));
    return container;
  }

  updateEventCard(container, event) {
    const parts = container.getData('parts');
    parts.accent.fillColor = event.accent;
    parts.badge.setText(event.badge.toUpperCase());
    this.fitTextToBox(parts.title, event.name, parts.title.style.wordWrapWidth, 34, 22, 15);
    this.fitTextToBox(parts.body, event.detail, parts.body.style.wordWrapWidth, parts.bodyHeight, 14, 11);
    this.fitTextToBox(parts.footer, 'Resolve now, then draw again next round.', parts.footer.style.wordWrapWidth, 18, 12, 10);
    container.setData('focusData', {
      title: event.name,
      subtitle: event.badge,
      body: event.detail
    });
  }

  drawEventCard() {
    if (this.eventDeck.length === 0) {
      this.eventDeck = Phaser.Utils.Array.Shuffle([...this.discardPile]);
      this.discardPile = [];
    }

    const event = this.eventDeck.pop();
    if (!event) {
      return;
    }

    event.apply(this);
    this.discardPile.push(event);
    this.updateEventCard(this.eventUI.reveal, event);
    this.refreshEventCounts();
    this.updateHeaderSummary();
  }

  refreshEventCounts() {
    if (!this.eventUI.pileText) {
      return;
    }
    this.eventUI.pileText.setText(`Deck ${this.eventDeck.length} cards   Discard ${this.discardPile.length} cards`);
  }

  createSupplyArea() {
    const area = this.layout.supply;
    const section = this.add.container(0, 0);
    this.sectionContainers.supply = section;
    const panel = this.add.rectangle(area.x + area.width / 2, area.y + area.height / 2, area.width, area.height, 0x2b2119, 0.9);
    panel.setStrokeStyle(2, 0xc4a460, 0.7);
    section.add(panel);
    this.supplyBounds = new Phaser.Geom.Rectangle(area.x, area.y, area.width, area.height);

    section.add(this.add.text(area.x + 14, area.y + 10, 'Available Colony Cards', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#fff1cf',
      fontStyle: 'bold'
    }));

    const cardHeight = area.height - 96;
    const cardWidth = Math.min(170, Math.max(128, area.width * 0.16));
    const step = cardWidth + 16;
    const totalWidth = step * TILE_TYPES.length - 16;
    const startX = area.x + (area.width - totalWidth) / 2 + cardWidth / 2;
    const centerY = area.y + area.height * 0.58;

    section.add(this.add.text(area.x + area.width / 2, area.y + 78, 'Keep the supply hidden most of the time. Pull it up when you are drafting or reorganizing chambers.', {
      fontFamily: 'Georgia',
      fontSize: '14px',
      color: '#f2e9d9',
      wordWrap: { width: area.width - 80 }
    }).setOrigin(0.5));

    TILE_TYPES.forEach((def, index) => {
      const x = startX + step * index;
      const y = centerY;
      const tile = this.createTile(def, x, y, cardWidth, cardHeight);
      tile.setData('home', new Phaser.Math.Vector2(tile.x, tile.y));
      tile.setData('assignedZone', null);
      tile.setData('cellKey', null);
      tile.setDepth(5);
      tile.setRotation(Phaser.Math.DegToRad(-5 + index * 3));
      tile.setData('homeRotation', tile.rotation);
      tile.setData('section', 'supply');
      this.tileSupply.push(tile);
      section.add(tile);
    });
  }

  createPlayerTableaus() {
    this.playerZones = [];
    const area = this.layout.tableaus;
    const metrics = this.metrics;
    const gridWidth = TABLEAU_COLS * metrics.tileSize + (TABLEAU_COLS - 1) * metrics.gridGap + metrics.gridPadding * 2;
    const gridHeight = TABLEAU_ROWS * metrics.tileSize + (TABLEAU_ROWS - 1) * metrics.gridGap + metrics.gridPadding * 2;

    for (let i = 0; i < PLAYER_COUNT; i += 1) {
      const container = this.add.container(0, 0);
      const originX = area.x;
      const originY = area.y;
      const centerX = originX + area.width / 2;
      const centerY = originY + metrics.matHeight / 2;

      const mat = this.add.rectangle(centerX, centerY, area.width, metrics.matHeight, 0x17110e, 0.9);
      mat.setStrokeStyle(3, i === 0 ? 0xe9c46a : 0x7dc5e5, 0.9);
      container.add(mat);

      container.add(this.add.text(originX + 14, originY + 12, this.players[i].name, {
        fontFamily: 'Trebuchet MS',
        fontSize: '22px',
        color: i === 0 ? '#f8df99' : '#bce9ff',
        fontStyle: 'bold'
      }));
      container.add(this.add.text(originX + 14, originY + 38, 'Build chambers like cards in your nest and track the colony state beside them.', {
        fontFamily: 'Georgia',
        fontSize: '13px',
        color: '#dfd1bd'
      }));

      const gridLeft = originX + metrics.matPadding;
      const gridTop = originY + 64;
      const gridRect = this.add.rectangle(gridLeft + gridWidth / 2, gridTop + gridHeight / 2, gridWidth, gridHeight, 0x241c18, 0.95);
      gridRect.setStrokeStyle(2, 0x5a4738, 1);
      container.add(gridRect);

      const gridBounds = new Phaser.Geom.Rectangle(gridLeft, gridTop, gridWidth, gridHeight);
      gridRect.setData('bounds', gridBounds);
      gridRect.setData('gridOrigin', {
        x: gridBounds.x + metrics.gridPadding + metrics.tileSize / 2,
        y: gridBounds.y + metrics.gridPadding + metrics.tileSize / 2
      });
      gridRect.setData('playerIndex', i);

      for (let row = 0; row < TABLEAU_ROWS; row += 1) {
        for (let col = 0; col < TABLEAU_COLS; col += 1) {
          const gx = gridRect.getData('gridOrigin').x + col * (metrics.tileSize + metrics.gridGap);
          const gy = gridRect.getData('gridOrigin').y + row * (metrics.tileSize + metrics.gridGap);
          const slot = this.add.rectangle(gx, gy, metrics.tableauCardWidth, metrics.tableauCardHeight, 0x2d241f, 0.82);
          slot.setStrokeStyle(2, 0x6f5946, 0.8);
          container.add(slot);
        }
      }

      const panelLeft = gridLeft + gridWidth + metrics.matPadding * 2;
      const panelWidth = area.width - (panelLeft - originX) - metrics.matPadding;
      const panel = this.createPlayerPanel(i, panelLeft, gridTop, panelWidth, gridHeight);
      container.add(panel.container);
      const tileSummary = this.add.text(gridLeft, gridTop + gridHeight + 12, '', {
        fontFamily: 'Georgia',
        fontSize: '13px',
        color: '#eadcc6'
      });
      container.add(tileSummary);

      this.playerZones.push({
        container,
        gridRect,
        panel,
        tileSummary,
        occupancy: {},
        tileCounts: this.createInitialTileCounts()
      });
      this.updateTileSummary(i);
      container.setVisible(i === this.activeColony);
    }
  }

  createInitialTileCounts() {
    return TILE_TYPES.reduce((acc, def) => {
      acc[def.key] = 0;
      return acc;
    }, {});
  }

  createPlayerPanel(playerIndex, x, y, width, height) {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x221914, 0.96);
    bg.setStrokeStyle(2, 0x735942, 0.9);
    container.add(bg);

    container.add(this.add.text(12, 10, 'Tracks', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#fff0cf',
      fontStyle: 'bold'
    }));

    const displays = {};
    const rowHeight = Math.max(28, Math.min(34, (height - 34) / RESOURCE_TRACKS.length));
    RESOURCE_TRACKS.forEach((track, idx) => {
      const rowY = 36 + idx * rowHeight;
      container.add(this.add.text(12, rowY, track.label, {
        fontFamily: 'Georgia',
        fontSize: '13px',
        color: '#e8dcc8'
      }));

      const valueBg = this.add.rectangle(width - 52, rowY + 10, 34, 24, 0xefe4c8, 1);
      valueBg.setStrokeStyle(1, 0x2b1d14, 0.8);
      container.add(valueBg);

      this.createStepperButton(container, width - 96, rowY + 10, '-', () => this.changeResource(playerIndex, track.key, -1));
      this.createStepperButton(container, width - 16, rowY + 10, '+', () => this.changeResource(playerIndex, track.key, 1));

      const valueText = this.add.text(width - 52, rowY - 1, `${this.players[playerIndex].stats[track.key]}`, {
        fontFamily: 'Trebuchet MS',
        fontSize: '15px',
        color: COLORS.ink,
        fontStyle: 'bold'
      });
      valueText.setOrigin(0.5, 0);
      container.add(valueText);
      displays[track.key] = valueText;
    });

    return { container, displays };
  }

  createStepperButton(container, x, y, label, callback) {
    const button = this.add.rectangle(x, y, 24, 24, 0x4a3527, 0.95);
    button.setStrokeStyle(1, 0xd9c092, 0.8);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerdown', callback);

    const text = this.add.text(x, y - 9, label, {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#fdf5e6',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', callback);

    container.add(button);
    container.add(text);
  }

  changeResource(playerIndex, key, delta) {
    const player = this.players[playerIndex];
    const track = RESOURCE_TRACKS.find((item) => item.key === key);
    if (!player || !track) {
      return;
    }

    const next = Phaser.Math.Clamp(player.stats[key] + delta, track.min, track.max);
    player.stats[key] = next;

    const panel = this.playerZones[playerIndex]?.panel;
    if (panel?.displays[key]) {
      panel.displays[key].setText(`${next}`);
    }
    this.updateHeaderSummary();
  }

  createTile(definition, x, y, width, height) {
    const container = this.add.container(x, y);
    container.setSize(width, height);
    container.setData('definition', definition);
    container.setData('baseWidth', width);
    container.setData('baseHeight', height);

    const base = this.add.rectangle(0, 0, width, height, 0xf5ecd7, 1);
    base.setStrokeStyle(2, 0x24180f, 0.9);
    const banner = this.add.rectangle(0, -height / 2 + 16, width - 16, 24, definition.color, 1);
    const title = this.add.text(-width / 2 + 12, -height / 2 + 3, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: `${Math.max(13, Math.min(17, width / 10))}px`,
      color: COLORS.ink,
      fontStyle: 'bold',
      wordWrap: { width: width - 24 }
    });
    const detail = this.add.text(-width / 2 + 12, -height / 2 + 38, '', {
      fontFamily: 'Georgia',
      fontSize: `${Math.max(11, Math.min(14, width / 13))}px`,
      color: COLORS.ink,
      wordWrap: { width: width - 24 }
    });
    const cost = this.add.text(-width / 2 + 12, height / 2 - 24, '', {
      fontFamily: 'Georgia',
      fontSize: '11px',
      color: '#5b4434'
    });

    this.fitTextToBox(title, definition.label, width - 24, 32, Math.max(13, Math.min(17, width / 10)), 11);
    this.fitTextToBox(detail, definition.detail, width - 24, Math.max(24, height - 84), Math.max(11, Math.min(14, width / 13)), 10);
    this.fitTextToBox(cost, `Cost: ${definition.cost}`, width - 24, 16, 11, 9);

    container.add([base, banner, title, detail, cost]);
    container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(container);
    container.on('pointerup', () => {
      if (!container.getData('isDragging')) {
        this.openFocusOverlay({
          title: definition.label,
          subtitle: `Cost ${definition.cost}`,
          body: definition.detail
        });
      }
    });
    return container;
  }

  createFocusOverlay() {
    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0);
    overlay.setDepth(100);
    overlay.setVisible(false);

    const scrim = this.add.rectangle(width / 2, height / 2, width, height, 0x120c08, 0.74);
    scrim.setInteractive({ useHandCursor: true });
    scrim.on('pointerdown', () => this.closeFocusOverlay());

    const cardWidth = Math.min(460, width * 0.46);
    const cardHeight = Math.min(360, height * 0.58);
    const panel = this.add.rectangle(width / 2, height / 2, cardWidth, cardHeight, 0xf6edd8, 1);
    panel.setStrokeStyle(4, 0x2a1d14, 0.9);
    panel.setInteractive();
    const ribbon = this.add.rectangle(width / 2, height / 2 - cardHeight / 2 + 22, cardWidth - 28, 28, 0x7b5c46, 1);
    const subtitle = this.add.text(width / 2 - cardWidth / 2 + 22, height / 2 - cardHeight / 2 + 8, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '13px',
      color: '#fff6ea',
      fontStyle: 'bold'
    });
    const title = this.add.text(width / 2 - cardWidth / 2 + 22, height / 2 - cardHeight / 2 + 48, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: COLORS.ink,
      fontStyle: 'bold',
      wordWrap: { width: cardWidth - 44 }
    });
    const body = this.add.text(width / 2 - cardWidth / 2 + 22, height / 2 - cardHeight / 2 + 106, '', {
      fontFamily: 'Georgia',
      fontSize: '18px',
      color: COLORS.ink,
      wordWrap: { width: cardWidth - 44 }
    });
    const close = this.add.text(width / 2 + cardWidth / 2 - 30, height / 2 - cardHeight / 2 + 12, 'X', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#fff6ea',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    close.setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closeFocusOverlay());

    overlay.add([scrim, panel, ribbon, subtitle, title, body, close]);
    overlay.setData('parts', { subtitle, title, body, bodyHeight: cardHeight - 132, bodyWidth: cardWidth - 44 });
    overlay.alpha = 0;
    this.focusOverlay = overlay;
  }

  openFocusOverlay(data) {
    if (!this.focusOverlay || !data) {
      return;
    }
    const parts = this.focusOverlay.getData('parts');
    parts.subtitle.setText(data.subtitle || '');
    this.fitTextToBox(parts.title, data.title || '', parts.bodyWidth, 44, 28, 18);
    this.fitTextToBox(parts.body, data.body || '', parts.bodyWidth, parts.bodyHeight, 18, 13);
    this.tweens.killTweensOf(this.focusOverlay);
    this.focusOverlay.setVisible(true);
    this.focusOverlay.alpha = 0;
    this.tweens.add({
      targets: this.focusOverlay,
      alpha: 1,
      duration: 160,
      ease: 'Sine.Out'
    });
  }

  closeFocusOverlay() {
    if (this.focusOverlay) {
      this.tweens.killTweensOf(this.focusOverlay);
      this.tweens.add({
        targets: this.focusOverlay,
        alpha: 0,
        duration: 130,
        ease: 'Sine.In',
        onComplete: () => {
          this.focusOverlay.setVisible(false);
        }
      });
    }
  }

  registerInput() {
    this.input.on('dragstart', (pointer, gameObject) => {
      gameObject.setData('isDragging', true);
      gameObject.setData('draggingFrom', new Phaser.Math.Vector2(gameObject.x, gameObject.y));
      this.children.bringToTop(gameObject);
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on('dragend', (pointer, gameObject) => {
      if (gameObject.getData('definition')) {
        this.handleTileDrop(pointer, gameObject);
      }
      this.time.delayedCall(0, () => gameObject.setData('isDragging', false));
    });
  }

  handleTileDrop(pointer, gameObject) {
    const dropZone = this.playerZones.find((zone) => Phaser.Geom.Rectangle.Contains(zone.gridRect.getData('bounds'), pointer.x, pointer.y));

    if (dropZone) {
      const snapped = this.snapToZone(dropZone.gridRect, pointer.x, pointer.y);
      this.assignTileToZone(gameObject, dropZone, snapped);
      return;
    }

    if (this.supplyBounds && Phaser.Geom.Rectangle.Contains(this.supplyBounds, pointer.x, pointer.y)) {
      this.returnTileToSupply(gameObject);
      return;
    }

    const last = gameObject.getData('draggingFrom');
    if (last) {
      gameObject.x = last.x;
      gameObject.y = last.y;
    }
  }

  assignTileToZone(gameObject, zone, snapped) {
    this.removeTileFromCurrentCell(gameObject);

    const cellKey = `${snapped.row}-${snapped.col}`;
    const existing = zone.occupancy[cellKey];
    if (existing && existing !== gameObject) {
      this.returnTileToSupply(existing);
    }

    zone.occupancy[cellKey] = gameObject;
    gameObject.x = snapped.x;
    gameObject.y = snapped.y;
    const scale = Math.min(
      this.metrics.tableauCardWidth / gameObject.getData('baseWidth'),
      this.metrics.tableauCardHeight / gameObject.getData('baseHeight')
    );
    gameObject.setScale(scale);
    gameObject.setRotation(0);
    gameObject.setData('draggingFrom', new Phaser.Math.Vector2(snapped.x, snapped.y));
    gameObject.setData('assignedZone', zone.gridRect.getData('playerIndex'));
    gameObject.setData('cellKey', cellKey);
    gameObject.setData('section', 'tableau');

    const playerIndex = zone.gridRect.getData('playerIndex');
    this.adjustTileCount(playerIndex, gameObject.getData('definition').key, 1);
  }

  removeTileFromCurrentCell(gameObject) {
    const currentZoneIndex = gameObject.getData('assignedZone');
    const currentCellKey = gameObject.getData('cellKey');
    if (currentZoneIndex === null || currentZoneIndex === undefined || !currentCellKey) {
      return;
    }

    const zone = this.playerZones[currentZoneIndex];
    if (zone && zone.occupancy[currentCellKey] === gameObject) {
      delete zone.occupancy[currentCellKey];
      this.adjustTileCount(currentZoneIndex, gameObject.getData('definition').key, -1);
    }

    gameObject.setData('assignedZone', null);
    gameObject.setData('cellKey', null);
  }

  returnTileToSupply(gameObject) {
    this.removeTileFromCurrentCell(gameObject);
    const home = gameObject.getData('home');
    if (home) {
      gameObject.x = home.x;
      gameObject.y = home.y;
      gameObject.setScale(1);
      gameObject.setRotation(gameObject.getData('homeRotation') || 0);
      gameObject.setData('draggingFrom', home.clone());
      gameObject.setData('section', 'supply');
    }
  }

  adjustTileCount(playerIndex, tileKey, delta) {
    const zone = this.playerZones[playerIndex];
    if (!zone) {
      return;
    }

    zone.tileCounts[tileKey] = Math.max(0, (zone.tileCounts[tileKey] || 0) + delta);
    this.updateTileSummary(playerIndex);
  }

  updateTileSummary(playerIndex) {
    const zone = this.playerZones[playerIndex];
    if (!zone) {
      return;
    }

    const summary = TILE_TYPES.map((def) => `${def.label.split(' ')[0]} ${zone.tileCounts[def.key]}`);
    zone.tileSummary.setText(`Built chambers: ${summary.join('  |  ')}`);
  }

  snapToZone(gridRect, pointerX, pointerY) {
    const origin = gridRect.getData('gridOrigin');
    const metrics = this.metrics;
    const col = Phaser.Math.Clamp(
      Math.round((pointerX - origin.x) / (metrics.tileSize + metrics.gridGap)),
      0,
      TABLEAU_COLS - 1
    );
    const row = Phaser.Math.Clamp(
      Math.round((pointerY - origin.y) / (metrics.tileSize + metrics.gridGap)),
      0,
      TABLEAU_ROWS - 1
    );

    return {
      x: origin.x + col * (metrics.tileSize + metrics.gridGap),
      y: origin.y + row * (metrics.tileSize + metrics.gridGap),
      row,
      col
    };
  }
}

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#111',
  scale: {
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game',
    mode: Phaser.Scale.RESIZE
  },
  scene: [PrototypeScene]
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
