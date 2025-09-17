import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  class MockContainer {
    public scene: any;
    public x: number;
    public y: number;
    public depth = 0;
    public visible = true;
    public alpha = 1;
    public scale = 1;
    private children: any[] = [];

    constructor(scene: any, x = 0, y = 0) {
      this.scene = scene;
      this.x = x;
      this.y = y;
    }

    setDepth(value: number): this {
      this.depth = value;
      return this;
    }

    setVisible(value: boolean): this {
      this.visible = value;
      return this;
    }

    setAlpha(value: number): this {
      this.alpha = value;
      return this;
    }

    setScale(value: number): this {
      this.scale = value;
      return this;
    }

    setPosition(x: number, y: number): this {
      this.x = x;
      this.y = y;
      return this;
    }

    add(child: any | any[]): this {
      if (Array.isArray(child)) {
        this.children.push(...child);
      } else {
        this.children.push(child);
      }
      return this;
    }

    removeAll(removeChildren?: boolean): this {
      if (removeChildren) {
        this.children.forEach(item => item?.destroy?.());
      }
      this.children = [];
      return this;
    }
  }

  class MockScene {
    public add = {
      existing: () => {},
    };

    public tweens = {
      add: () => ({}),
      killTweensOf: () => {},
    };

    public time = {
      delayedCall: () => ({ remove: () => {} }),
    };

    public input = {
      setDefaultCursor: () => {},
      keyboard: {
        removeAllListeners: () => {},
        on: () => {},
      },
      on: () => {},
    };

    public cameras = {
      main: { width: 800, height: 600 },
    };
  }

  return {
    __esModule: true,
    default: {
      GameObjects: { Container: MockContainer },
      Scene: MockScene,
      Types: { GameObjects: { Text: {} } },
    },
    GameObjects: { Container: MockContainer },
    Scene: MockScene,
    Types: { GameObjects: { Text: {} } },
  };
});

vi.mock('../src/client/services/HighScoreService', () => ({
  highScoreService: {
    getUsername: () => 'tester',
    hasCustomUsername: () => false,
    getRedditUsername: () => 'tester',
    setCustomUsername: vi.fn(async () => ({ success: true, offlineFallback: false })),
    submitScore: async () => ({ rank: undefined }),
    getDailyLeaderboard: async () => [],
    getHighScore: async () => 0,
  },
}));

vi.mock('../src/client/services/LeaderboardService', () => ({
  leaderboardService: {
    fetchLeaderboard: vi.fn(async () => []),
    getCached: vi.fn(() => null),
    primeCache: vi.fn(),
  },
}));

import * as Phaser from 'phaser';
import { DS } from '../src/client/game/config/DesignSystem';
import { UIComponent } from '../src/client/game/presentation/ui/components/UIComponent';
import { GameOverUI } from '../src/client/game/presentation/ui/GameOverUI';
import { SettingsUI } from '../src/client/game/presentation/ui/SettingsUI';
import { ModernLeaderboardUI } from '../src/client/game/presentation/ui/ModernLeaderboardUI';
import { ToastUI } from '../src/client/game/presentation/ui/ToastUI';

class TestComponent extends UIComponent {
  constructor(scene: Phaser.Scene) {
    super(scene);
  }
}

const createScene = (): Phaser.Scene => new Phaser.Scene();

describe('UIComponent design tokens', () => {
  it('exposes spacing values from the design system', () => {
    const component = new TestComponent(createScene());
    expect(component.getSpacing('lg')).toBe(DS.getSpacingValue('lg'));
    expect(component.spacing.xl).toBe(DS.getSpacingValue('xl'));
  });

  it('exposes typography defaults from the design system', () => {
    const component = new TestComponent(createScene());
    expect(component.getFontFamily('display')).toBe(DS.getFontFamily('display'));
    expect(component.typography.fontSize['2xl']).toBe(DS.getFontSize('2xl'));
  });
});

describe.each([
  ['GameOverUI', GameOverUI],
  ['SettingsUI', SettingsUI],
  ['ModernLeaderboardUI', ModernLeaderboardUI],
  ['ToastUI', ToastUI],
])('%s inheritance', (_, Component) => {
  it('extends UIComponent', () => {
    expect(Component.prototype instanceof UIComponent).toBe(true);
  });

  it('shares spacing and typography helpers', () => {
    expect(Component.prototype.getSpacing).toBe(UIComponent.prototype.getSpacing);
    expect(Component.prototype.getFontFamily).toBe(UIComponent.prototype.getFontFamily);
  });
});
