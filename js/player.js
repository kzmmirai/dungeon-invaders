import { INIT_STATS, LV_UP, MAX_LV, MAX_ITEMS } from './constants.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    Object.assign(this, { ...INIT_STATS });
    this.items = [];
    this.floor = 1;
    this.x = 0;
    this.y = 0;
  }

  expToNext() {
    return LV_UP.expBase * this.lv;
  }

  addExp(amount) {
    if (this.lv >= MAX_LV) return false;
    this.exp += amount;
    let leveled = false;
    while (this.exp >= this.expToNext() && this.lv < MAX_LV) {
      this.exp -= this.expToNext();
      this.lv++;
      this.maxHp += LV_UP.hp;
      this.hp = this.maxHp;
      this.atk += LV_UP.atk;
      this.def += LV_UP.def;
      if (this.lv % 5 === 0) {
        this.bulletSpeed += 0.5;
      }
      leveled = true;
    }
    return leveled;
  }

  takeDamage(rawDmg) {
    // DEF reduces damage by 30% at most, so high ATK enemies always hurt
    const reduction = Math.min(this.def, Math.floor(rawDmg * 0.3));
    const dmg = Math.max(2, rawDmg - reduction);
    this.hp = Math.max(0, this.hp - dmg);
    return dmg;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  fullHeal() {
    this.hp = this.maxHp;
  }

  addItem(item) {
    if (this.items.length >= MAX_ITEMS) return false;
    this.items.push(item);
    return true;
  }

  useItem(index) {
    if (index < 0 || index >= this.items.length) return null;
    const item = this.items[index];
    this.items.splice(index, 1);
    return item;
  }

  isDead() {
    return this.hp <= 0;
  }

  // Save to localStorage
  save() {
    const data = {
      hp: this.hp, maxHp: this.maxHp, atk: this.atk, def: this.def,
      lv: this.lv, exp: this.exp, bulletSpeed: this.bulletSpeed,
      floor: this.floor,
      items: this.items.map(i => i.id),
    };
    localStorage.setItem('dungeon_invaders_save', JSON.stringify(data));
  }

  // Load from localStorage
  load() {
    const raw = localStorage.getItem('dungeon_invaders_save');
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      this.hp = data.hp; this.maxHp = data.maxHp;
      this.atk = data.atk; this.def = data.def;
      this.lv = data.lv; this.exp = data.exp;
      this.bulletSpeed = data.bulletSpeed;
      this.floor = data.floor;
      // Items are restored by main.js since it needs ITEM_TYPES
      this._savedItemIds = data.items || [];
      return true;
    } catch { return false; }
  }

  static hasSave() {
    return !!localStorage.getItem('dungeon_invaders_save');
  }

  static deleteSave() {
    localStorage.removeItem('dungeon_invaders_save');
  }
}
