import React, { useState, useEffect, useRef } from 'react';
import { Sword, Skull, Zap, Trophy, Shield, ShoppingBag, Music, User, Calendar, Lock, BookOpen, Settings, Volume2, Flame, Hourglass, Globe, Download, Upload, Map, Hammer, ArrowRight, Pickaxe, Video, Battery, EyeOff } from 'lucide-react';

// --- CONFIGURATION ADMOB (Sauvegardée pour référence future) ---
// Android App ID: ca-app-pub-5805757737293445~9154378744
// Android Banner: ca-app-pub-5805757737293445/5215133733
// Android Reward: ca-app-pub-5805757737293445/9629662095

// --- AUDIO ENGINE ---
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
let audioCtx: AudioContext | null = null;
let ambianceNode: AudioBufferSourceNode | null = null;
let ambianceGain: GainNode | null = null;
let lfoNode: OscillatorNode | null = null;

const initAudio = () => {
  if (!audioCtx && AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const toggleAmbiance = (enable: boolean, type: string) => {
  const ctx = initAudio();
  if (!ctx) return;
  
  if (ambianceNode) { try { ambianceNode.stop(); } catch(e) {} ambianceNode = null; }
  if (lfoNode) { try { lfoNode.stop(); } catch(e) {} lfoNode = null; }

  if (!enable || type === 'silence') return;

  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + (0.02 * white)) / 1.02;
    data[i] = lastOut * 3.5;
    if (type === 'rain') data[i] *= 1.5;
    if (type === 'river') data[i] = (lastOut + white * 0.1) * 2;
  }

  ambianceNode = ctx.createBufferSource();
  ambianceNode.buffer = buffer;
  ambianceNode.loop = true;
  ambianceGain = ctx.createGain();
  ambianceGain.gain.value = 0.05;

  const filter = ctx.createBiquadFilter();
  if (type === 'rain') { filter.type = 'lowpass'; filter.frequency.value = 800; }
  else if (type === 'fire') { filter.type = 'lowpass'; filter.frequency.value = 400; ambianceGain.gain.value = 0.03; }
  else if (type === 'wind') {
    filter.type = 'bandpass'; filter.frequency.value = 400; filter.Q.value = 1;
    lfoNode = ctx.createOscillator(); lfoNode.type = 'sine'; lfoNode.frequency.value = 0.1;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 200;
    lfoNode.connect(lfoGain); lfoGain.connect(filter.frequency); lfoNode.start();
  } else if (type === 'space') { filter.type = 'lowpass'; filter.frequency.value = 150; ambianceGain.gain.value = 0.1; }
  else if (type === 'river') { filter.type = 'lowpass'; filter.frequency.value = 1200; }
  else { filter.type = 'lowpass'; filter.frequency.value = 600; }

  ambianceNode.connect(filter);
  filter.connect(ambianceGain);
  ambianceGain.connect(ctx.destination);
  ambianceNode.start();
};

const playSfx = (type: string) => {
  const ctx = initAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

  if (type === 'attack') { osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(40, now+0.1); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.1); osc.start(now); osc.stop(now+0.1); }
  else if (type === 'coin') { osc.type='sine'; osc.frequency.setValueAtTime(1200, now); osc.frequency.setValueAtTime(1600, now+0.1); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.3); osc.start(now); osc.stop(now+0.3); }
  else if (type === 'win') { osc.type='triangle'; osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(554, now+0.1); osc.frequency.setValueAtTime(659, now+0.2); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now+0.6); osc.start(now); osc.stop(now+0.6); }
  else if (type === 'lose') { osc.type='sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(50, now+0.4); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now+0.4); osc.start(now); osc.stop(now+0.4); }
  else if (type === 'click') { osc.frequency.setValueAtTime(600, now); gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.05); osc.start(now); osc.stop(now+0.05); }
  else if (type === 'freeze') { osc.type='sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.linearRampToValueAtTime(400, now+0.5); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now+0.5); osc.start(now); osc.stop(now+0.5); }
  else if (type === 'crit') { osc.type='square'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(50, now+0.2); gain.gain.setValueAtTime(0.1, now); osc.start(now); osc.stop(now+0.2); }
  else if (type === 'boss') { osc.type='sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.linearRampToValueAtTime(50, now+1.0); gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now+1.0); osc.start(now); osc.stop(now+1.0); }
  else if (type === 'kill') { osc.type='square'; osc.frequency.setValueAtTime(100, now); osc.frequency.linearRampToValueAtTime(0, now+0.1); gain.gain.setValueAtTime(0.1, now); osc.start(now); osc.stop(now+0.1); }
  else if (type === 'upgrade') { osc.type='triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(800, now+0.1); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now+0.2); osc.start(now); osc.stop(now+0.2); }
  else if (type === 'ad') { osc.type='sine'; osc.frequency.setValueAtTime(600, now); osc.frequency.setValueAtTime(1200, now+0.2); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now+0.5); osc.start(now); osc.stop(now+0.5); }
  else if (type === 'error') { osc.type='sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.linearRampToValueAtTime(50, now+0.3); gain.gain.setValueAtTime(0.1, now); osc.start(now); osc.stop(now+0.3); }
};

// --- SAFE AD BANNER COMPONENT ---
const SafeAdBanner = () => {
  // In a real Capacitor app, checking for errors is handled by the plugin events
  return (
    <div className="bg-black border-t border-stone-800 h-[50px] w-full flex items-center justify-center relative overflow-hidden">
       <div className="text-stone-600 text-[10px] uppercase tracking-widest z-10">
          Publicité (ID: ...3733)
       </div>
    </div>
  );
};

// --- MONSTER AVATAR (SVG) ---
const MonsterAvatar = ({ id, color, isBoss, sizeClass = "w-32 h-32" }: { id: string, color: string, isBoss: boolean, sizeClass?: string }) => {
  const glow = isBoss ? 'drop-shadow(0 0 10px red)' : '';
  
  return (
    <div className={`${sizeClass} flex items-center justify-center transition-all duration-300 ${isBoss ? 'scale-110' : ''}`} style={{ filter: glow }}>
      <svg viewBox="0 0 100 100" className={`w-full h-full ${color}`}>
        {id.includes('slime') && <path d="M20,80 Q10,80 10,70 Q10,40 50,40 Q90,40 90,70 Q90,80 80,80 Z" fill="currentColor" opacity="0.9" />}
        {id.includes('goblin') && <circle cx="50" cy="50" r="35" fill="currentColor" opacity="0.9" />}
        {id.includes('skeleton') && <g><circle cx="50" cy="40" r="25" fill="#e5e5e5" /><rect x="45" y="65" width="10" height="20" fill="#e5e5e5" /></g>}
        {id.includes('dragon') && <path d="M20,60 Q30,20 50,20 Q70,20 80,60 Q90,80 50,90 Q10,80 20,60" fill="currentColor" />}
        {id.includes('ghost') && <path d="M20,80 L20,40 Q20,10 50,10 Q80,10 80,40 L80,80 L70,70 L60,80 L50,70 L40,80 L30,70 Z" fill="currentColor" opacity="0.7" />}
        {id.includes('rat') && <ellipse cx="50" cy="60" rx="30" ry="20" fill="currentColor" />}
        {id.includes('wolf') && <path d="M20,70 L30,30 L50,70 L70,30 L80,70 Z" fill="currentColor" />}
        {id.includes('treant') && <rect x="30" y="20" width="40" height="60" rx="5" fill="currentColor" />}
        {id.includes('bat') && <path d="M10,40 Q30,60 50,40 Q70,60 90,40 L50,70 Z" fill="currentColor" />}
        {id.includes('zombie') && <rect x="35" y="30" width="30" height="50" rx="5" fill="currentColor" />}
        {id.includes('imp') && <path d="M30,70 L50,30 L70,70 Z" fill="currentColor" />}
        {id.includes('elemental') && <circle cx="50" cy="50" r="30" fill="currentColor" filter="blur(2px)" />}
        {id.includes('golem') && <rect x="25" y="25" width="50" height="50" rx="2" fill="currentColor" />}
        {id.includes('shadow') && <circle cx="50" cy="50" r="30" fill="currentColor" opacity="0.5" filter="blur(4px)" />}
        {id.includes('beholder') && <circle cx="50" cy="50" r="35" fill="currentColor" />}
        {id.includes('demon') && <path d="M20,30 L50,80 L80,30 L50,10 Z" fill="currentColor" />}
        
        {!['slime','goblin','skeleton','dragon','ghost','rat','wolf','treant','bat','zombie','imp','elemental','golem','shadow','beholder','demon'].some(k => id.includes(k)) && 
          <circle cx="50" cy="50" r="35" fill="currentColor" opacity="0.7" />
        }
        
        <circle cx="35" cy="45" r="5" fill="white" />
        <circle cx="65" cy="45" r="5" fill="white" />
        <circle cx="35" cy="45" r="2" fill="black" />
        <circle cx="65" cy="45" r="2" fill="black" />
        {isBoss ? <path d="M30,65 Q50,55 70,65" stroke="white" strokeWidth="3" fill="none" /> : <path d="M30,65 Q50,75 70,65" stroke="white" strokeWidth="3" fill="none" />}
      </svg>
    </div>
  );
};

// --- DATA ---

type Lang = 'fr' | 'en';

const TEXTS = {
  fr: {
    play: "Jouer", shop: "Boutique", profile: "Profil", bestiary: "Bestiaire", talents: "Talents", zones: "Carte",
    settings: "Paramètres", sfx: "Bruitages", ambiance: "Ambiance",
    minutes: "Minutes", backpack: "Sac à dos", weapons: "Armes", potions: "Potions", pets: "Compagnons",
    level: "Niveau", xp: "XP", gold: "Or", kills: "Kills", hours: "Heures", streak: "Série",
    hp: "PV", damage: "Dégâts", cost: "Coût", owned: "Acquis", equipped: "Équipé",
    victory: "Session Terminée !", defeat: "Échec", gold_won: "Or Gagné", xp_won: "XP Gagné", session_kills: "Monstres vaincus",
    return_menu: "Retour au menu", give_up: "Abandonner", focus_active: "Focus Actif",
    freeze_active: "STASE", freeze_desc: "Reviens vite !",
    daily_title: "Bonus Quotidien", daily_desc: "Série actuelle :", daily_claim: "Récupérer",
    claim: "Réclamer", received: "Reçu", unknown: "???", unlock: "Vaincre pour débloquer",
    save_title: "Sauvegarde", save_export: "Copier la sauvegarde", save_import: "Importer une sauvegarde",
    save_copied: "Copié !", save_error: "Code invalide", save_loaded: "Sauvegarde chargée !",
    reset_data: "Réinitialiser les données", reset_confirm: "Tout effacer ?",
    lang_select: "Langue / Language",
    str: "Force", greed: "Avarice", wis: "Sagesse", points: "Points",
    str_desc: "+5% Dégâts", greed_desc: "+5% Or", wis_desc: "+5% XP",
    raid_boss: "Raid Boss", raid_desc: "Défi Longue Durée",
    zone_forest: "Forêt Ancienne", zone_catacombs: "Catacombs", zone_volcano: "Montagne de Feu", zone_void: "Le Néant",
    travel: "Voyager", locked: "Verrouillé", upgrade: "Améliorer", level_short: "Niv",
    bonus_zone: "Bonus de Zone", boss_spawn: "BOSS EN APPROCHE !", combo: "COMBO",
    ad_chest: "Coffre Pub", ad_chest_desc: "Regarder une vidéo pour 500 🪙",
    ad_revive: "Ressusciter", ad_revive_desc: "Regarder une pub pour continuer",
    battery_mode: "Mode Éco", battery_mode_on: "Toucher pour réveiller",
    ad_error: "Erreur Pub: Récompense non attribuée", ad_loading: "Chargement Pub..."
  },
  en: {
    play: "Play", shop: "Shop", profile: "Profile", bestiary: "Bestiary", talents: "Talents", zones: "Map",
    settings: "Settings", sfx: "Sound FX", ambiance: "Ambiance",
    minutes: "Minutes", backpack: "Backpack", weapons: "Weapons", potions: "Potions", pets: "Pets",
    level: "Level", xp: "XP", gold: "Gold", kills: "Kills", hours: "Hours", streak: "Streak",
    hp: "HP", damage: "Damage", cost: "Cost", owned: "Owned", equipped: "Equipped",
    victory: "Session Complete!", defeat: "Defeat", gold_won: "Gold Won", xp_won: "XP Won", session_kills: "Monsters defeated",
    return_menu: "Return to Menu", give_up: "Give Up", focus_active: "Focus Active",
    freeze_active: "STASIS", freeze_desc: "Come back quick!",
    daily_title: "Daily Bonus", daily_desc: "Current Streak:", daily_claim: "Claim",
    claim: "Claim", received: "Received", unknown: "???", unlock: "Defeat to unlock",
    save_title: "Data Backup", save_export: "Copy Save Code", save_import: "Import Save Code",
    save_copied: "Copied!", save_error: "Invalid Code", save_loaded: "Save Loaded!",
    reset_data: "Reset Data", reset_confirm: "Erase everything?",
    lang_select: "Langue / Language",
    str: "Strength", greed: "Greed", wis: "Wisdom", points: "Points",
    str_desc: "+5% Damage", greed_desc: "+5% Gold", wis_desc: "+5% XP",
    raid_boss: "Boss Raid", raid_desc: "Long Duration Challenge",
    zone_forest: "Ancient Forest", zone_catacombs: "Catacombs", zone_volcano: "Fire Mountain", zone_void: "The Void",
    travel: "Travel", locked: "Locked", upgrade: "Upgrade", level_short: "Lvl",
    bonus_zone: "Zone Bonus", boss_spawn: "BOSS INCOMING!", combo: "COMBO",
    ad_chest: "Ad Chest", ad_chest_desc: "Watch video for 500 🪙",
    ad_revive: "Revive", ad_revive_desc: "Watch ad to continue",
    battery_mode: "Eco Mode", battery_mode_on: "Tap to wake",
    ad_error: "Ad Error: No reward given", ad_loading: "Loading Ad..."
  }
};

const ZONES = [
  { id: 'forest', name: 'zone_forest', cost: 0, mult: 1, monsters: ['slime', 'rat', 'wolf', 'goblin', 'treant'], color: 'from-emerald-900 to-stone-900', icon: '🌲' },
  { id: 'catacombs', name: 'zone_catacombs', cost: 2000, mult: 1.5, monsters: ['skeleton', 'bat_mob', 'ghost_mob', 'zombie', 'necromancer'], color: 'from-slate-900 to-black', icon: '☠️' },
  { id: 'volcano', name: 'zone_volcano', cost: 8000, mult: 2.5, monsters: ['imp', 'fire_elemental', 'salamander', 'golem', 'dragon'], color: 'from-red-900 to-orange-900', icon: '🌋' },
  { id: 'void', name: 'zone_void', cost: 30000, mult: 5, monsters: ['shadow', 'beholder', 'cultist', 'cthulhu', 'demon'], color: 'from-purple-900 to-black', icon: '🌌' },
];

const MONSTERS = [
  { id: 'slime', baseHp: 300, xp: 25, color: "text-green-500", name: { fr: "Slime", en: "Slime" }, lore: { fr: "Gluant.", en: "Sticky." } },
  { id: 'rat', baseHp: 450, xp: 35, color: "text-stone-500", name: { fr: "Rat Géant", en: "Giant Rat" }, lore: { fr: "Porteur de maladies.", en: "Disease carrier." } },
  { id: 'wolf', baseHp: 600, xp: 50, color: "text-stone-400", name: { fr: "Loup", en: "Wolf" }, lore: { fr: "Chasse en meute.", en: "Hunts in packs." } },
  { id: 'goblin', baseHp: 800, xp: 60, color: "text-green-700", name: { fr: "Gobelin", en: "Goblin" }, lore: { fr: "Voleur.", en: "Thief." } },
  { id: 'treant', baseHp: 1500, xp: 100, color: "text-green-900", name: { fr: "Tréant", en: "Treant" }, lore: { fr: "Lent mais solide.", en: "Slow but tough." } },
  { id: 'skeleton', baseHp: 2000, xp: 150, color: "text-stone-300", name: { fr: "Squelette", en: "Skeleton" }, lore: { fr: "Claque des dents.", en: "Rattles." } },
  { id: 'bat_mob', baseHp: 1800, xp: 140, color: "text-purple-400", name: { fr: "Vampire", en: "Vampire" }, lore: { fr: "Suceur de sang.", en: "Blood sucker." } },
  { id: 'ghost_mob', baseHp: 2500, xp: 180, color: "text-cyan-300", name: { fr: "Spectre", en: "Specter" }, lore: { fr: "Intangible.", en: "Intangible." } },
  { id: 'zombie', baseHp: 3000, xp: 200, color: "text-green-800", name: { fr: "Zombie", en: "Zombie" }, lore: { fr: "Cerveauuu...", en: "Braaains..." } },
  { id: 'necromancer', baseHp: 4000, xp: 300, color: "text-purple-600", name: { fr: "Nécromancien", en: "Necromancer" }, lore: { fr: "Maître des morts.", en: "Master of dead." } },
  { id: 'imp', baseHp: 5000, xp: 400, color: "text-red-400", name: { fr: "Diablotin", en: "Imp" }, lore: { fr: "Farceur cruel.", en: "Cruel joker." } },
  { id: 'fire_elemental', baseHp: 7000, xp: 500, color: "text-orange-500", name: { fr: "Élémentaire", en: "Elemental" }, lore: { fr: "Chaud devant.", en: "Hot stuff." } },
  { id: 'salamander', baseHp: 8500, xp: 600, color: "text-orange-400", name: { fr: "Salamandre", en: "Salamander" }, lore: { fr: "Nage dans la lave.", en: "Swims in lava." } },
  { id: 'golem', baseHp: 12000, xp: 800, color: "text-stone-600", name: { fr: "Golem Magma", en: "Magma Golem" }, lore: { fr: "Incassable.", en: "Unbreakable." } },
  { id: 'dragon', baseHp: 20000, xp: 1200, color: "text-red-600", name: { fr: "Dragon", en: "Dragon" }, lore: { fr: "Seigneur du feu.", en: "Fire lord." } },
  { id: 'shadow', baseHp: 30000, xp: 1500, color: "text-gray-900", name: { fr: "Ombre", en: "Shadow" }, lore: { fr: "Votre pire ennemi.", en: "Your worst enemy." } },
  { id: 'beholder', baseHp: 45000, xp: 2000, color: "text-purple-300", name: { fr: "Observateur", en: "Beholder" }, lore: { fr: "Il voit tout.", en: "Sees all." } },
  { id: 'cultist', baseHp: 60000, xp: 2500, color: "text-red-900", name: { fr: "Cultiste", en: "Cultist" }, lore: { fr: "Fou.", en: "Mad." } },
  { id: 'cthulhu', baseHp: 100000, xp: 4000, color: "text-green-900", name: { fr: "Ancien", en: "Ancient One" }, lore: { fr: "Indescriptible.", en: "Indescribable." } },
  { id: 'demon', baseHp: 250000, xp: 10000, color: "text-red-950", name: { fr: "Roi Démon", en: "Demon King" }, lore: { fr: "Le boss final.", en: "The final boss." } },
];

const WEAPONS = [
  { id: 'hands', name: { fr: "Mains Nues", en: "Bare Hands" }, damage: 5, cost: 0, icon: "✊" },
  { id: 'stick', name: { fr: "Bâton", en: "Stick" }, damage: 15, cost: 150, icon: "🪵" },
  { id: 'dagger', name: { fr: "Dague", en: "Dagger" }, damage: 35, cost: 500, icon: "🗡️" },
  { id: 'bat', name: { fr: "Batte Cloutée", en: "Spiked Bat" }, damage: 60, cost: 1200, icon: "🏏" },
  { id: 'sword', name: { fr: "Épée Fer", en: "Iron Sword" }, damage: 100, cost: 3000, icon: "⚔️" },
  { id: 'axe', name: { fr: "Hache Double", en: "Great Axe" }, damage: 180, cost: 6000, icon: "🪓" },
  { id: 'katana', name: { fr: "Katana", en: "Katana" }, damage: 300, cost: 12000, icon: "🎌" },
  { id: 'hammer', name: { fr: "Marteau Guerre", en: "Warhammer" }, damage: 500, cost: 25000, icon: "🔨" },
  { id: 'rune', name: { fr: "Lame Runique", en: "Rune Blade" }, damage: 1000, cost: 60000, icon: "💠" },
  { id: 'excalibur', name: { fr: "Excalibur", en: "Excalibur" }, damage: 2500, cost: 150000, icon: "✨" },
  { id: 'scythe', name: { fr: "Faux", en: "Scythe" }, damage: 5000, cost: 400000, icon: "☠️" },
  { id: 'god', name: { fr: "Tueur de Dieux", en: "Godslayer" }, damage: 12000, cost: 1000000, icon: "⚡" },
];

const ITEMS = [
  { id: 'potion_gold', type: 'buff', name: { fr: "Potion Caféine", en: "Caffeine Potion" }, cost: 150, icon: "☕", effect: { fr: "Double l'Or", en: "Double Gold" } },
  { id: 'potion_freeze', type: 'passive', name: { fr: "Sablier Stase", en: "Stasis Hourglass" }, cost: 400, icon: "⏳", effect: { fr: "Sauve 1 fois (30s)", en: "Saves once (30s)" } },
];

const PETS = [
  { id: 'rock', type: 'damage', val: 5, name: {fr: 'Caillou', en: 'Pet Rock'}, cost: 250, icon: '🪨', desc: {fr: '+5 Dégâts/s', en: '+5 Dmg/s'} },
  { id: 'bat', type: 'damage', val: 25, name: {fr: 'Chauve-souris', en: 'Bat'}, cost: 1500, icon: '🦇', desc: {fr: '+25 Dégâts/s', en: '+25 Dmg/s'} },
  { id: 'cat', type: 'crit', val: 0.1, name: {fr: 'Chat', en: 'Cat'}, cost: 4000, icon: '😺', desc: {fr: '+10% Critique', en: '+10% Crit Chance'} },
  { id: 'ghost', type: 'gold', val: 0.20, name: {fr: 'Fantôme', en: 'Ghost'}, cost: 8000, icon: '👻', desc: {fr: '+20% Or', en: '+20% Gold'} },
  { id: 'owl', type: 'xp', val: 0.20, name: {fr: 'Hibou', en: 'Owl'}, cost: 12000, icon: '🦉', desc: {fr: '+20% XP', en: '+20% XP'} },
  { id: 'book', type: 'xp', val: 0.35, name: {fr: 'Grimoire', en: 'Grimoire'}, cost: 25000, icon: '📘', desc: {fr: '+35% XP', en: '+35% XP'} },
  { id: 'phoenix', type: 'regen', val: 0, name: {fr: 'Phénix', en: 'Phoenix'}, cost: 50000, icon: '🦅', desc: {fr: 'Juste stylé', en: 'Just cool'} },
  { id: 'dragon_pet', type: 'damage', val: 500, name: {fr: 'Bébé Dragon', en: 'Baby Dragon'}, cost: 100000, icon: '🐲', desc: {fr: '+500 Dégâts/s', en: '+500 Dmg/s'} },
];

const AMBIANCES = [
  { id: 'silence', icon: "😶", name: { fr: "Silence", en: "Silence" }, bg: "bg-stone-900" },
  { id: 'rain', icon: "🌧️", name: { fr: "Pluie", en: "Rain" }, bg: "bg-slate-900" },
  { id: 'fire', icon: "🔥", name: { fr: "Feu", en: "Fire" }, bg: "bg-orange-950" },
  { id: 'brown', icon: "🌊", name: { fr: "Bruit Brun", en: "Brown Noise" }, bg: "bg-stone-800" },
  { id: 'wind', icon: "💨", name: { fr: "Vent", en: "Wind" }, bg: "bg-zinc-800" },
  { id: 'river', icon: "🏞️", name: { fr: "Rivière", en: "River" }, bg: "bg-cyan-950" },
  { id: 'space', icon: "🌌", name: { fr: "Espace", en: "Space" }, bg: "bg-indigo-950" },
];

function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (e) { return defaultValue; }
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

export default function App() {
  const defaultLang: Lang = typeof navigator !== 'undefined' && navigator.language.startsWith('fr') ? 'fr' : 'en';
  const [lang, setLang] = useStickyState<Lang>(defaultLang, 'ff_lang');

  const [gold, setGold] = useStickyState(0, 'ff_gold');
  const [currentWeapon, setCurrentWeapon] = useStickyState(0, 'ff_weapon');
  const [weaponLevels, setWeaponLevels] = useStickyState<Record<number, number>>({}, 'ff_weapon_levels');
  const [inventory, setInventory] = useStickyState<string[]>([], 'ff_inventory');
  const [ownedPets, setOwnedPets] = useStickyState<string[]>([], 'ff_pets');
  const [equippedPet, setEquippedPet] = useStickyState<string | null>(null, 'ff_equipped_pet');
  
  const [talents, setTalents] = useStickyState({ str: 0, greed: 0, wis: 0 }, 'ff_talents');
  const [playerXp, setPlayerXp] = useStickyState(0, 'ff_xp');
  const [playerLevel, setPlayerLevel] = useStickyState(1, 'ff_level');
  
  const [unlockedZones, setUnlockedZones] = useStickyState<string[]>(['forest'], 'ff_unlocked_zones');
  const [currentZone, setCurrentZone] = useStickyState('forest', 'ff_current_zone');

  const [totalMinutes, setTotalMinutes] = useStickyState(0, 'ff_mins');
  const [monstersKilled, setMonstersKilled] = useStickyState(0, 'ff_kills');
  const [lastLoginDate, setLastLoginDate] = useStickyState('', 'ff_login');
  const [streakDays, setStreakDays] = useStickyState(0, 'ff_streak');
  const [claimedAch, setClaimedAch] = useStickyState<string[]>([], 'ff_ach');
  const [bestiary, setBestiary] = useStickyState<string[]>([], 'ff_bestiary');
  
  const [sfxEnabled, setSfxEnabled] = useStickyState(true, 'ff_sfx');
  const [ambianceEnabled, setAmbianceEnabled] = useStickyState(false, 'ff_ambiance');

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'victory' | 'defeat'>('menu');
  const [activeTab, setActiveTab] = useState<'play' | 'shop' | 'profile' | 'zones' | 'bestiary'>('play');
  const [shopTab, setShopTab] = useState<'weapons' | 'items' | 'pets'>('weapons');
  const [showSettings, setShowSettings] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [batteryMode, setBatteryMode] = useState(false);

  const [selectedTime, setSelectedTime] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [currentAmbiance, setCurrentAmbiance] = useState(0);
  const [activeBuff, setActiveBuff] = useState<string | null>(null);
  
  const [sessionKills, setSessionKills] = useState(0);
  const [sessionGoldEarned, setSessionGoldEarned] = useState(0);
  const [sessionXpEarned, setSessionXpEarned] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);

  const [freezeTimeLeft, setFreezeTimeLeft] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);

  const [currentMonsterIndex, setCurrentMonsterIndex] = useState(0);
  const [monsterCurrentHp, setMonsterCurrentHp] = useState(100);
  const [isAttacking, setIsAttacking] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const [lastDamage, setLastDamage] = useState(0);
  const [isCrit, setIsCrit] = useState(false);
  const [shinyType, setShinyType] = useState<'none' | 'gold' | 'xp' | 'boss'>('none');
  
  const [particles, setParticles] = useState<{id: number, x: number, y: number}[]>([]);

  const timerRef = useRef<number | null>(null);
  const freezeIntervalRef = useRef<number | null>(null);
  const comboIntervalRef = useRef<number | null>(null);
  
  const monster = MONSTERS[currentMonsterIndex];
  const weapon = WEAPONS[currentWeapon];
  const weaponLvl = weaponLevels[currentWeapon] || 0;
  const activePetObj = PETS.find(p => p.id === equippedPet);
  const zoneObj = ZONES.find(z => z.id === currentZone) || ZONES[0];

  const getWeaponDamage = () => {
    return Math.floor(weapon.damage * (1 + (weaponLvl * 0.2))); 
  };

  const multDamage = (1 + (talents.str * 0.05));
  const multGold = (1 + (talents.greed * 0.05)) * zoneObj.mult * (1 + (combo * 0.1));
  const multXp = (1 + (talents.wis * 0.05)) * zoneObj.mult;

  const t = (key: keyof typeof TEXTS.fr) => TEXTS[lang][key];
  const tData = (data: { fr: string, en: string }) => data[lang];

  useEffect(() => {
    if (gameState === 'playing' && ambianceEnabled) {
      toggleAmbiance(true, AMBIANCES[currentAmbiance].id);
    } else {
      toggleAmbiance(false, 'silence');
    }
    return () => toggleAmbiance(false, 'silence');
  }, [gameState, ambianceEnabled, currentAmbiance]);

  const triggerSfx = (type: string) => { if (sfxEnabled) playSfx(type); };

  const spawnParticles = (count: number) => {
    const newParticles = Array.from({length: count}).map((_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => { setParticles(prev => prev.filter(p => !newParticles.includes(p))); }, 500);
  };

  // --- ADS LOGIC (FAILSAFE) ---
  const handleWatchAd = (rewardType: 'chest' | 'revive') => {
    if (isAdLoading) return;
    setIsAdLoading(true);
    
    const simulateAdCall = new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.1 ? resolve(true) : reject("AdMob Error");
      }, 2000);
    });

    simulateAdCall
      .then(() => {
        triggerSfx('ad');
        if (rewardType === 'chest') {
          setGold(g => g + 500);
          triggerSfx('coin');
          alert("Récompense reçue : 500 Or !");
        } else if (rewardType === 'revive') {
          setGameState('playing');
          setMonsterCurrentHp(monster.baseHp); 
          triggerSfx('win');
        }
      })
      .catch((error) => {
        console.warn("Ad Failed:", error);
        triggerSfx('error');
        alert(t('ad_error'));
      })
      .finally(() => {
        setIsAdLoading(false);
      });
  };

  useEffect(() => {
    const today = new Date().toDateString();
    if (lastLoginDate !== today && gameState === 'menu') setTimeout(() => setShowDailyReward(true), 1000);
  }, [lastLoginDate, gameState]);

  const claimDaily = () => {
    triggerSfx('coin');
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastLoginDate === yesterday.toDateString()) setStreakDays(s => s + 1);
    else if (lastLoginDate !== today) setStreakDays(1);
    setLastLoginDate(today);
    setGold(g => g + 100);
    setShowDailyReward(false);
  };

  const pickRandomMonsterForZone = () => {
    const allowedMonsters = zoneObj.monsters;
    const possibleIndices: number[] = [];
    MONSTERS.forEach((m, idx) => {
      if (allowedMonsters.includes(m.id)) possibleIndices.push(idx);
    });
    if (possibleIndices.length > 0) {
      return possibleIndices[Math.floor(Math.random() * possibleIndices.length)];
    }
    return 0; 
  };

  const spawnMonster = (isFirst = false) => {
    let type: 'none' | 'gold' | 'xp' | 'boss' = 'none';
    
    if (!isFirst && (sessionKills + 1) % 10 === 0) {
      type = 'boss';
      triggerSfx('boss');
    } else {
      const roll = Math.random();
      if (roll > 0.95) type = 'gold'; 
      else if (roll > 0.90) type = 'xp'; 
    }
    setShinyType(type);

    let nextIdx = pickRandomMonsterForZone();
    setCurrentMonsterIndex(nextIdx);
    
    const nextMonster = MONSTERS[nextIdx];
    let hp = nextMonster.baseHp;
    if (type === 'boss') hp *= 5; 
    hp *= (1 + (playerLevel * 0.05));
    
    setMonsterCurrentHp(hp);
  };

  const startBattle = (minutes: number) => {
    triggerSfx('click');
    initAudio();
    setSelectedTime(minutes);
    setTimeLeft(minutes * 60);
    setSessionKills(0);
    setSessionGoldEarned(0);
    setSessionXpEarned(0);
    setCombo(0);
    setComboTimer(0);
    
    spawnMonster(true);
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState === 'playing' && !isFrozen) {
      comboIntervalRef.current = window.setInterval(() => {
        setComboTimer(prev => {
          if (prev <= 0) {
            setCombo(0);
            return 0;
          }
          return prev - 1;
        });
      }, 100);
    }
    return () => { if (comboIntervalRef.current) clearInterval(comboIntervalRef.current); };
  }, [gameState, isFrozen]);

  useEffect(() => {
    if (gameState === 'playing' && !isFrozen) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { endBattle(true); return 0; }
          
          setIsAttacking(true);
          setTimeout(() => setIsAttacking(false), 150);
          setIsHit(true);
          setTimeout(() => setIsHit(false), 200);

          let dmg = getWeaponDamage() * multDamage;
          if (activePetObj?.type === 'damage') dmg += activePetObj.val;

          let critChance = 0.15 + (talents.wis * 0.01);
          if (activePetObj?.type === 'crit') critChance += activePetObj.val;

          const isCritHit = Math.random() < critChance;
          if (isCritHit) dmg *= 3;
          
          setLastDamage(Math.floor(dmg));
          setIsCrit(isCritHit);
          if(Math.random() > 0.7) spawnParticles(isCritHit ? 10 : 3);

          if (isCritHit) triggerSfx('crit'); else triggerSfx('attack');

          setMonsterCurrentHp((h) => {
            const newHp = h - dmg;
            if (newHp <= 0) {
              triggerSfx('kill');
              handleMonsterKill();
              return 99999;
            }
            return newHp;
          });
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, isFrozen, currentWeapon, weaponLevels, talents, equippedPet, currentMonsterIndex]);

  const handleMonsterKill = () => {
    const killedMonster = MONSTERS[currentMonsterIndex];
    setSessionKills(k => k + 1);
    
    setCombo(c => Math.min(c + 1, 10)); 
    setComboTimer(50); 

    let g = killedMonster.xp; 
    let x = killedMonster.xp; 

    if (shinyType === 'boss') { g *= 10; x *= 10; }
    else if (shinyType === 'gold') g *= 5;
    else if (shinyType === 'xp') x *= 5;

    if (activeBuff === 'potion_gold') g *= 2;
    if (activePetObj?.type === 'gold') g *= (1 + activePetObj.val);
    if (activePetObj?.type === 'xp') x *= (1 + activePetObj.val);

    g *= multGold;
    x *= multXp;

    setSessionGoldEarned(cur => cur + Math.floor(g));
    setSessionXpEarned(cur => cur + Math.floor(x));
    
    if (!bestiary.includes(killedMonster.id)) {
      setBestiary(b => [...b, killedMonster.id]);
    }

    spawnMonster(false);
  };

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && gameState === 'playing') {
        if (inventory.includes('potion_freeze') && !isFrozen) {
          setIsFrozen(true);
          setFreezeTimeLeft(30);
          triggerSfx('freeze');
          setInventory(inv => inv.filter(id => id !== 'potion_freeze'));
          freezeIntervalRef.current = window.setInterval(() => {
            setFreezeTimeLeft(prev => {
              if (prev <= 1) { endBattle(false); return 0; }
              return prev - 1;
            });
          }, 1000);
        } else if (!isFrozen) endBattle(false);
      } else if (!document.hidden && isFrozen) {
        setIsFrozen(false);
        if (freezeIntervalRef.current) clearInterval(freezeIntervalRef.current);
        triggerSfx('win');
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { document.removeEventListener("visibilitychange", handleVisibility); if (freezeIntervalRef.current) clearInterval(freezeIntervalRef.current); };
  }, [gameState, isFrozen, inventory]);

  const endBattle = (victory: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (freezeIntervalRef.current) clearInterval(freezeIntervalRef.current);
    if (comboIntervalRef.current) clearInterval(comboIntervalRef.current);
    setIsFrozen(false);
    
    if (victory) {
      triggerSfx('win');
      setGold(g => g + sessionGoldEarned);
      setMonstersKilled(k => k + sessionKills);
      setTotalMinutes(m => m + selectedTime);

      let xp = playerXp + sessionXpEarned + (selectedTime * 10);
      let lvl = playerLevel;
      while (xp >= lvl * 100) { xp -= lvl * 100; lvl++; }
      setPlayerXp(xp);
      setPlayerLevel(lvl);

      setGameState('victory');
    } else {
      triggerSfx('lose');
      setGameState('defeat');
    }
    setActiveBuff(null);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`;
  const xpTarget = playerLevel * 100;
  const progress = (playerXp / xpTarget) * 100;
  const mainBg = gameState === 'playing' ? `bg-gradient-to-br ${zoneObj.color}` : 'bg-stone-950';
  
  const spentTalents = talents.str + talents.greed + talents.wis;
  const availableTalents = Math.max(0, (playerLevel - 1) - spentTalents);

  const upgradeWeapon = (idx: number) => {
    const lvl = weaponLevels[idx] || 0;
    const wCost = WEAPONS[idx].cost;
    const cost = wCost > 0 ? Math.floor(wCost * 0.5 * (lvl + 1)) : 100 * (lvl + 1);
    if (gold >= cost) {
      triggerSfx('upgrade');
      setGold(g => g - cost);
      setWeaponLevels(prev => ({...prev, [idx]: lvl + 1}));
    }
  };

  const unlockZone = (zId: string, cost: number) => {
    if (gold >= cost && !unlockedZones.includes(zId)) {
      triggerSfx('win');
      setGold(g => g - cost);
      setUnlockedZones(prev => [...prev, zId]);
    }
  };

  const exportSave = () => {
    const data = { gold, currentWeapon, weaponLevels, inventory, playerXp, playerLevel, totalMinutes, monstersKilled, bestiary, claimedAch, ownedPets, equippedPet, talents, unlockedZones, currentZone };
    const code = btoa(JSON.stringify(data));
    navigator.clipboard.writeText(code).then(() => alert(t('save_copied')));
  };
  const importSave = () => {
    const code = prompt(t('save_import'));
    if (!code) return;
    try {
      const data = JSON.parse(atob(code));
      if (data.gold !== undefined) {
        setGold(data.gold); setCurrentWeapon(data.currentWeapon||0); setWeaponLevels(data.weaponLevels||{});
        setInventory(data.inventory||[]); setPlayerXp(data.playerXp||0); setPlayerLevel(data.playerLevel||1);
        setTotalMinutes(data.totalMinutes||0); setMonstersKilled(data.monstersKilled||0);
        setBestiary(data.bestiary||[]); setClaimedAch(data.claimedAch||[]); setOwnedPets(data.ownedPets||[]);
        setEquippedPet(data.equippedPet||null); setTalents(data.talents||{str:0,greed:0,wis:0});
        setUnlockedZones(data.unlockedZones||['forest']); setCurrentZone(data.currentZone||'forest');
        alert(t('save_loaded')); window.location.reload();
      }
    } catch (e) { alert(t('save_error')); }
  };

  return (
    <div className={`flex justify-center items-center min-h-screen ${mainBg} font-mono text-white p-4 select-none transition-colors duration-1000`}>
      <div className="w-full max-w-md bg-stone-900 rounded-3xl shadow-2xl overflow-hidden border-4 border-stone-800 relative flex flex-col h-[850px] max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-stone-900 p-3 border-b border-stone-800 z-20 flex justify-between items-center">
           <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-stone-700 rounded-full flex items-center justify-center font-bold text-xs border border-stone-500 relative">
                 {playerLevel}
                 {streakDays > 0 && <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center border border-stone-900"><Flame size={8} fill="white" /></div>}
              </div>
              <div className="flex flex-col w-20">
                 <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${progress}%`}}></div></div>
                 <span className="text-[9px] text-stone-500 mt-0.5">{playerXp}/{xpTarget} {t('xp')}</span>
              </div>
           </div>
           <div className="flex items-center space-x-2">
             <div className="flex items-center bg-stone-800 px-2 py-1 rounded-lg border border-stone-700">
               <span className="text-xs mr-1">🪙</span><span className="text-xs font-bold text-yellow-100">{Math.floor(gold)}</span>
             </div>
             <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 bg-stone-800 rounded-full text-stone-400 hover:text-white border border-stone-700"><Settings size={16}/></button>
           </div>
        </div>

        {/* SETTINGS */}
        {showSettings && (
           <div className="absolute top-14 right-4 z-50 bg-stone-800 border border-stone-600 rounded-xl p-4 shadow-xl w-64 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-sm">{t('settings')}</h3><button onClick={() => setShowSettings(false)}><X size={16}/></button></div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center"><div className="flex items-center text-xs text-stone-300"><Globe size={14} className="mr-2"/> {t('lang_select')}</div><button onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')} className="text-xs font-bold bg-stone-700 px-2 py-1 rounded">{lang.toUpperCase()}</button></div>
                 <div className="flex justify-between items-center"><div className="flex items-center text-xs text-stone-300"><Volume2 size={14} className="mr-2"/> {t('sfx')}</div><button onClick={() => setSfxEnabled(!sfxEnabled)} className={`w-8 h-4 rounded-full relative transition-colors ${sfxEnabled ? 'bg-green-500' : 'bg-stone-600'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${sfxEnabled ? 'left-4.5' : 'left-0.5'}`}></div></button></div>
                 <div className="flex justify-between items-center"><div className="flex items-center text-xs text-stone-300"><Music size={14} className="mr-2"/> {t('ambiance')}</div><button onClick={() => setAmbianceEnabled(!ambianceEnabled)} className={`w-8 h-4 rounded-full relative transition-colors ${ambianceEnabled ? 'bg-green-500' : 'bg-stone-600'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ambianceEnabled ? 'left-4.5' : 'left-0.5'}`}></div></button></div>
              </div>
              <div className="pt-4 border-t border-stone-700 space-y-2 mt-4">
                 <button onClick={exportSave} className="w-full flex items-center justify-center text-xs bg-stone-700 hover:bg-stone-600 py-2 rounded text-stone-300"><Upload size={12} className="mr-2"/> {t('save_export')}</button>
                 <button onClick={importSave} className="w-full flex items-center justify-center text-xs bg-stone-700 hover:bg-stone-600 py-2 rounded text-stone-300"><Download size={12} className="mr-2"/> {t('save_import')}</button>
              </div>
           </div>
        )}

        {/* --- MENU CONTENT --- */}
        {gameState === 'menu' && (
           <div className="flex-1 overflow-y-auto pb-20">
              {activeTab === 'play' && (
                 <div className="p-6 flex flex-col items-center">
                    
                    <div className={`w-full h-40 rounded-xl flex flex-col items-center justify-center border-4 border-stone-700 relative overflow-hidden mb-6 bg-gradient-to-br ${zoneObj.color}`}>
                        <div className="text-6xl mb-2">{zoneObj.icon}</div>
                        <div className="font-black text-2xl uppercase tracking-widest text-white shadow-black drop-shadow-md">{t(zoneObj.name as any)}</div>
                        <div className="text-xs font-bold bg-black/30 px-3 py-1 rounded-full mt-2 border border-white/20">{t('bonus_zone')}: x{zoneObj.mult}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full mb-4">
                       {[10, 25, 45, 60].map(time => (
                          <button key={time} onClick={() => startBattle(time)} className="bg-stone-800 hover:bg-red-900/30 border-2 border-stone-700 py-3 rounded-xl flex flex-col items-center group transition-colors">
                             <span className="text-2xl font-black text-stone-200 group-hover:text-white">{time}</span><span className="text-[9px] text-stone-500 font-bold uppercase">{t('minutes')}</span>
                          </button>
                       ))}
                    </div>
                    
                    <button onClick={() => startBattle(90)} className="w-full bg-red-900/40 hover:bg-red-800/60 border-2 border-red-700 py-3 rounded-xl flex items-center justify-center gap-4 mb-6 group transition-all">
                       <Skull className="text-red-400 group-hover:animate-pulse" />
                       <div className="text-left">
                          <div className="font-bold text-red-200 uppercase tracking-widest text-sm">{t('raid_boss')}</div>
                          <div className="text-[9px] text-red-400">90 {t('minutes')} • +++ REWARDS</div>
                       </div>
                    </button>

                    <div className="w-full space-y-4">
                       <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {AMBIANCES.map((amb, idx) => (
                             <button key={idx} onClick={() => setCurrentAmbiance(idx)} className={`px-3 py-2 rounded-lg border text-xs flex items-center whitespace-nowrap transition-colors ${currentAmbiance === idx ? 'bg-stone-700 border-stone-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-500'}`}><span className="mr-1">{amb.icon}</span> {tData(amb.name)}</button>
                          ))}
                       </div>
                       {inventory.length > 0 && <div className="p-3 bg-stone-800/50 rounded-xl border border-stone-800"><span className="text-[10px] uppercase font-bold text-stone-500 mb-2 block">{t('backpack')}</span><div className="flex gap-2">{ITEMS.filter(i => inventory.includes(i.id)).map(item => (<button key={item.id} onClick={item.type === 'passive' ? undefined : () => {setActiveBuff(item.id); setInventory(inv => inv.filter(id => id !== item.id))}} className={`border px-3 py-2 rounded-lg flex items-center gap-2 text-xs ${item.type === 'passive' ? 'bg-stone-900/50 border-stone-700 text-stone-500' : 'bg-stone-900 border-stone-600'}`}><span>{item.icon}</span> {tData(item.name)}</button>))}</div></div>}
                    </div>
                 </div>
              )}

              {activeTab === 'shop' && (
                 <div className="p-4">
                    <div className="flex mb-4 bg-stone-800 p-1 rounded-lg">
                       <button onClick={() => setShopTab('weapons')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${shopTab === 'weapons' ? 'bg-stone-600 text-white' : 'text-stone-500'}`}>{t('weapons')}</button>
                       <button onClick={() => setShopTab('items')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${shopTab === 'items' ? 'bg-stone-600 text-white' : 'text-stone-500'}`}>{t('potions')}</button>
                       <button onClick={() => setShopTab('pets')} className={`flex-1 py-2 text-xs font-bold uppercase rounded ${shopTab === 'pets' ? 'bg-stone-600 text-white' : 'text-stone-500'}`}>{t('pets')}</button>
                    </div>
                    {/* AD CHEST */}
                    <div onClick={() => handleWatchAd('chest')} className="mb-4 bg-gradient-to-r from-yellow-900 to-yellow-700 p-3 rounded-xl border border-yellow-500 flex items-center justify-between cursor-pointer active:scale-95 transition">
                       <div className="flex items-center gap-3">
                          {isAdLoading ? <div className="animate-spin text-yellow-200"><Hourglass size={24}/></div> : <Video size={24} className="text-yellow-200" />}
                          <div><div className="font-bold text-sm text-yellow-100">{isAdLoading ? t('ad_loading') : t('ad_chest')}</div><div className="text-[10px] text-yellow-300">{t('ad_chest_desc')}</div></div>
                       </div>
                       <div className="bg-black/30 px-3 py-1 rounded text-xs font-bold">GO</div>
                    </div>

                    {shopTab === 'weapons' && <div className="space-y-2">{WEAPONS.map((w, idx) => {
                       const lvl = weaponLevels[idx] || 0;
                       const dmg = Math.floor(w.damage * (1 + (lvl * 0.2)));
                       const upgCost = w.cost > 0 ? Math.floor(w.cost * 0.5 * (lvl + 1)) : 100 * (lvl + 1);
                       const isOwned = currentWeapon >= idx; 
                       return (
                          <div key={idx} className={`w-full p-3 rounded-xl border flex flex-col gap-2 ${currentWeapon === idx ? 'bg-green-900/20 border-green-500/50' : 'bg-stone-800 border-stone-700'}`}>
                             <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                   <div className="text-xl w-10 h-10 bg-stone-900 rounded flex items-center justify-center relative">
                                      {w.icon}
                                      {lvl > 0 && <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] rounded px-1">+{lvl}</div>}
                                   </div>
                                   <div><div className="font-bold text-sm text-stone-200">{tData(w.name)}</div><div className="text-[10px] text-stone-500">{t('damage')}: {dmg}</div></div>
                                </div>
                                {isOwned ? (currentWeapon === idx ? <div className="w-2 h-2 bg-green-500 rounded-full"></div> : <button onClick={() => setCurrentWeapon(idx)} className="text-[10px] bg-stone-700 px-2 py-1 rounded text-stone-300">{t('equipped')}</button>) : <button onClick={() => {if(gold>=w.cost){setGold(g=>g-w.cost); setCurrentWeapon(idx)}}} className="text-yellow-400 text-xs font-bold border border-yellow-500/30 px-2 py-1 rounded">{w.cost} 🪙</button>}
                             </div>
                             {isOwned && (
                                <button onClick={() => upgradeWeapon(idx)} className="flex items-center justify-center gap-2 bg-stone-900/50 hover:bg-stone-900 p-2 rounded text-[10px] text-stone-400 border border-dashed border-stone-700">
                                   <Hammer size={10} /> {t('upgrade')} (+20%) <span className="text-yellow-500 font-bold">{upgCost} 🪙</span>
                                </button>
                             )}
                          </div>
                       )
                    })}</div>}
                    {shopTab === 'pets' && <div className="space-y-2">{PETS.map((pet) => (<button key={pet.id} onClick={() => {if (!ownedPets.includes(pet.id) && gold >= pet.cost) {setGold(g => g - pet.cost); setOwnedPets(p => [...p, pet.id]); setEquippedPet(pet.id)}}} className={`w-full p-3 rounded-xl border flex justify-between items-center text-left ${ownedPets.includes(pet.id) ? (equippedPet === pet.id ? 'bg-green-900/20 border-green-500/50' : 'bg-stone-800 border-stone-700') : 'bg-stone-800 border-stone-700'}`}><div className="flex items-center gap-3"><div className="text-xl w-10 h-10 bg-stone-900 rounded flex items-center justify-center">{pet.icon}</div><div><div className="font-bold text-sm text-stone-200">{tData(pet.name)}</div><div className="text-[10px] text-stone-500">{tData(pet.desc)}</div></div></div>{ownedPets.includes(pet.id) ? (equippedPet === pet.id ? <div className="text-green-500 text-[10px] font-bold">ACTIF</div> : <button onClick={(e) => {e.stopPropagation(); setEquippedPet(pet.id)}} className="text-[10px] text-stone-400 bg-stone-900 px-2 py-1 rounded">Mettre</button>) : <span className="text-yellow-400 text-xs font-bold">{pet.cost} 🪙</span>}</button>))}</div>}
                    {shopTab === 'items' && <div className="grid grid-cols-2 gap-3">{ITEMS.map(item => (<button key={item.id} onClick={() => {if (gold >= item.cost) {setGold(g => g - item.cost); setInventory(i => [...i, item.id])}}} className="bg-stone-800 p-3 rounded-xl border border-stone-700 flex flex-col items-center text-center hover:bg-stone-700 transition"><div className="text-2xl mb-2">{item.icon}</div><div className="font-bold text-xs text-stone-200">{tData(item.name)}</div><div className="text-[10px] text-stone-500 mb-3 h-6 leading-tight flex items-center justify-center">{tData(item.effect)}</div><div className="text-yellow-400 text-xs font-bold">{item.cost} 🪙</div></button>))}</div>}
                 </div>
              )}

              {(activeTab === 'profile' || activeTab === 'bestiary' || activeTab === 'zones') && (
                 <div className="p-4 flex flex-col h-full">
                    <div className="flex mb-4 bg-stone-800 p-1 rounded-lg overflow-x-auto">
                       <button onClick={() => setActiveTab('zones')} className={`flex-1 py-2 text-xs font-bold uppercase rounded px-2 whitespace-nowrap ${activeTab === 'zones' ? 'bg-indigo-600 text-white' : 'text-stone-500'}`}>{t('zones')}</button>
                       <button onClick={() => setActiveTab('profile')} className={`flex-1 py-2 text-xs font-bold uppercase rounded px-2 whitespace-nowrap ${activeTab === 'profile' ? 'bg-stone-600 text-white' : 'text-stone-500'}`}>{t('profile')}</button>
                       <button onClick={() => setActiveTab('bestiary')} className={`flex-1 py-2 text-xs font-bold uppercase rounded px-2 whitespace-nowrap ${activeTab === 'bestiary' ? 'bg-stone-600 text-white' : 'text-stone-500'}`}>{t('bestiary')}</button>
                    </div>
                    
                    {activeTab === 'zones' && (
                        <div className="space-y-3 pb-4">
                           {ZONES.map(z => {
                              const isUnlocked = unlockedZones.includes(z.id);
                              const isCurrent = currentZone === z.id;
                              return (
                                 <div key={z.id} onClick={() => {if(isUnlocked) setCurrentZone(z.id)}} className={`relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${isCurrent ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-stone-700'} ${!isUnlocked && 'opacity-70 grayscale'}`}>
                                    <div className={`absolute inset-0 bg-gradient-to-r ${z.color} opacity-50`}></div>
                                    <div className="relative p-4 flex justify-between items-center">
                                       <div className="flex items-center gap-4">
                                          <div className="text-3xl">{z.icon}</div>
                                          <div>
                                             <div className="font-bold text-sm text-white uppercase">{t(z.name as any)}</div>
                                             <div className="text-[10px] text-stone-300 font-bold">Bonus: x{z.mult}</div>
                                          </div>
                                       </div>
                                       {isUnlocked ? (
                                          isCurrent ? <div className="bg-indigo-500 text-white text-[10px] px-2 py-1 rounded font-bold">ACTUEL</div> : <div className="text-xs text-stone-400 flex items-center">{t('travel')} <ArrowRight size={12} className="ml-1"/></div>
                                       ) : (
                                          <button onClick={(e) => {e.stopPropagation(); unlockZone(z.id, z.cost)}} className="bg-stone-900/80 hover:bg-black text-yellow-400 text-xs px-3 py-2 rounded border border-yellow-500/30 flex items-center gap-2 font-bold"><Lock size={12}/> {z.cost}</button>
                                       )}
                                    </div>
                                 </div>
                              )
                           })}
                        </div>
                    )}

                    {activeTab === 'profile' && (
                       <div className="space-y-4 pb-4">
                          <div className="bg-stone-800 p-4 rounded-xl border border-stone-700">
                             <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold flex items-center"><Pickaxe size={14} className="mr-2"/> {t('talents')}</h3><span className="text-xs text-stone-400">{t('points')}: <span className="text-white font-bold">{availableTalents}</span></span></div>
                             <div className="space-y-2">
                                <div className="flex justify-between items-center bg-stone-900/50 p-2 rounded-lg"><div className="flex items-center gap-2"><Sword size={14} className="text-red-400"/><span className="text-xs">{t('str')}</span></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-stone-400">{talents.str}</span><button disabled={availableTalents===0} onClick={()=>setTalents(t=>({...t, str:t.str+1}))} className={`w-5 h-5 rounded flex items-center justify-center text-xs ${availableTalents>0?'bg-blue-600':'bg-stone-700'}`}>+</button></div></div>
                                <div className="flex justify-between items-center bg-stone-900/50 p-2 rounded-lg"><div className="flex items-center gap-2"><ShoppingBag size={14} className="text-yellow-400"/><span className="text-xs">{t('greed')}</span></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-stone-400">{talents.greed}</span><button disabled={availableTalents===0} onClick={()=>setTalents(t=>({...t, greed:t.greed+1}))} className={`w-5 h-5 rounded flex items-center justify-center text-xs ${availableTalents>0?'bg-blue-600':'bg-stone-700'}`}>+</button></div></div>
                                <div className="flex justify-between items-center bg-stone-900/50 p-2 rounded-lg"><div className="flex items-center gap-2"><BookOpen size={14} className="text-blue-400"/><span className="text-xs">{t('wis')}</span></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-stone-400">{talents.wis}</span><button disabled={availableTalents===0} onClick={()=>setTalents(t=>({...t, wis:t.wis+1}))} className={`w-5 h-5 rounded flex items-center justify-center text-xs ${availableTalents>0?'bg-blue-600':'bg-stone-700'}`}>+</button></div></div>
                             </div>
                          </div>
                          <div className="flex justify-around bg-stone-800 p-3 rounded-xl border border-stone-700 mb-2">
                             <div className="text-center"><div className="text-xs text-stone-400 uppercase">{t('kills')}</div><div className="font-bold">{monstersKilled}</div></div>
                             <div className="text-center"><div className="text-xs text-stone-400 uppercase">{t('hours')}</div><div className="font-bold">{(totalMinutes/60).toFixed(1)}</div></div>
                             <div className="text-center"><div className="text-xs text-stone-400 uppercase">{t('streak')}</div><div className="font-bold flex items-center justify-center text-orange-500"><Flame size={12} className="mr-1"/>{streakDays}</div></div>
                          </div>
                          <div className="mt-8 text-center"><button onClick={() => {if(confirm(t('reset_confirm'))) {window.localStorage.clear(); window.location.reload();}}} className="text-xs text-red-900 hover:text-red-500">{t('reset_data')}</button></div>
                       </div>
                    )}

                    {activeTab === 'bestiary' && (
                      <div className="grid grid-cols-2 gap-3 pb-4">
                        {MONSTERS.map(m => {
                          const unlocked = bestiary.includes(m.id);
                          return (
                            <div key={m.id} className={`bg-stone-800 p-3 rounded-xl border ${unlocked ? 'border-stone-600' : 'border-stone-800 opacity-50'} text-center flex flex-col items-center justify-center h-40`}>
                              <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center mb-2 bg-stone-900/50 rounded-full border border-stone-700 overflow-hidden">
                                {unlocked ? (
                                  <MonsterAvatar id={m.id} color={m.color} isBoss={false} sizeClass="w-full h-full" />
                                ) : (
                                  <span className="text-2xl grayscale opacity-30">?</span>
                                )}
                              </div>
                              {unlocked ? (
                                <>
                                  <div className="font-bold text-xs text-stone-200">{tData(m.name)}</div>
                                  <div className="text-[9px] italic text-stone-500 mt-1">"{tData(m.lore)}"</div>
                                </>
                              ) : (
                                <>
                                  <div className="font-bold text-xs text-stone-500">{t('unknown')}</div>
                                  <div className="flex items-center justify-center mt-1 text-[9px] text-stone-600 gap-1"><Lock size={8}/> {t('unlock')}</div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                 </div>
              )}
           </div>
        )}

        {/* --- PLAYING STATE --- */}
        {gameState === 'playing' && (
           <div className={`flex-1 flex flex-col relative overflow-hidden ${batteryMode ? 'bg-black' : ''}`}>
              
              {/* BATTERY MODE OVERLAY */}
              {batteryMode && (
                 <div onClick={() => setBatteryMode(false)} className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-stone-600">
                    <EyeOff size={48} className="mb-4 animate-pulse" />
                    <div className="text-sm font-mono">{t('battery_mode_on')}</div>
                 </div>
              )}

              {/* Top Bar */}
              <div className="absolute top-4 left-4 z-20 flex gap-2">
                 {activeBuff === 'potion_gold' && <div className="bg-stone-900/80 px-2 py-1 rounded text-xs text-yellow-400 border border-yellow-500/30 flex items-center animate-pulse"><Zap size={10} className="mr-1"/> x2</div>}
                 <div className="bg-stone-900/80 px-2 py-1 rounded text-xs text-stone-400 border border-stone-700 flex items-center"><Music size={10} className="mr-1"/> {tData(AMBIANCES[currentAmbiance].name)}</div>
              </div>
              
              {/* Battery Toggle */}
              <button onClick={() => setBatteryMode(!batteryMode)} className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-stone-900/50 p-2 rounded-full text-stone-500 hover:text-white"><Battery size={16}/></button>

              {/* Right HUD */}
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 items-end">
                 <div className="bg-stone-900/80 px-3 py-2 rounded-lg border border-stone-700 text-right">
                    <div className="text-[10px] text-stone-400 uppercase font-bold">{t('session_kills')}</div>
                    <div className="text-xl font-black text-red-400">{sessionKills} <span className="text-stone-500 text-sm">/ ∞</span></div>
                    <div className="flex gap-2 text-[9px] mt-1">
                       <span className="text-yellow-400">+{sessionGoldEarned} 🪙</span>
                       <span className="text-blue-400">+{sessionXpEarned} XP</span>
                    </div>
                 </div>
                 {combo > 1 && (
                    <div className="bg-orange-900/80 border border-orange-500 px-3 py-1 rounded-lg animate-bounce">
                       <div className="text-xs font-black text-orange-400 uppercase tracking-widest">{t('combo')} x{combo}</div>
                       <div className="w-full h-1 bg-stone-800 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-orange-500 transition-all duration-100" style={{width: `${(comboTimer/50)*100}%`}}></div>
                       </div>
                    </div>
                 )}
              </div>

              {isFrozen && <div className="absolute inset-0 z-50 bg-blue-900/50 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in"><Hourglass size={64} className="text-blue-300 animate-spin mb-4" /><h2 className="text-3xl font-black text-white uppercase tracking-widest">{t('freeze_active')}</h2><div className="text-6xl font-mono text-white mt-4">{freezeTimeLeft}s</div></div>}

              {shinyType === 'boss' && <div className="absolute top-20 left-0 right-0 text-center animate-pulse"><span className="bg-red-600 text-white text-xs font-black px-4 py-1 rounded-full shadow-lg border-2 border-white">{t('boss_spawn')}</span></div>}

              {particles.map(p => (<div key={p.id} className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping pointer-events-none" style={{left: `calc(50% + ${p.x}px)`, top: `calc(40% + ${p.y}px)`}} />))}

              {/* Monster */}
              <div className={`flex-1 flex flex-col items-center justify-center relative transition-transform duration-75 ${isHit ? 'translate-x-1 translate-y-1' : ''}`}>
                 <div className={`relative z-10 transition-transform duration-100 ${isHit ? 'scale-95 brightness-150' : 'animate-bounce-slow'}`}>
                    <MonsterAvatar id={monster.id} color={monster.color} isBoss={shinyType === 'boss'} />
                    {isHit && <div className={`absolute top-0 right-0 font-black text-4xl animate-ping select-none ${isCrit ? 'text-yellow-400 scale-150' : 'text-red-500'}`}>-{lastDamage}</div>}
                 </div>
                 <div className="w-48 mt-8 bg-stone-900 rounded-full h-3 border border-stone-600 overflow-hidden relative">
                    <div className={`h-full transition-all duration-300 ${monster.color.replace('text-','bg-')}`} style={{ width: `${Math.min(100, (monsterCurrentHp / (monster.baseHp * (shinyType==='boss'?5:1) * (1+(playerLevel*0.05)))) * 100)}%` }}></div>
                 </div>
                 <div className="mt-2 text-xs font-bold text-stone-400">{Math.ceil(monsterCurrentHp)} / {Math.ceil(monster.baseHp * (shinyType==='boss'?5:1) * (1+(playerLevel*0.05)))}</div>
              </div>

              {/* Controls */}
              <div className="bg-stone-900 p-6 border-t-4 border-stone-700 pb-12">
                 <div className="flex flex-col items-center mb-6">
                    <div className="text-6xl font-black text-white tracking-widest font-mono">{formatTime(timeLeft)}</div>
                    <div className="text-stone-500 text-xs mt-2 uppercase flex items-center animate-pulse text-red-400"><Shield size={12} className="mr-1"/> {t('focus_active')}</div>
                 </div>
                 <div className="flex justify-center items-center opacity-50 text-6xl transition-transform duration-100 relative" style={{transform: isAttacking ? 'translateY(-20px) rotate(10deg)' : 'none'}}>
                    {weapon.icon}
                    {activePetObj && <div className="absolute -right-8 top-0 text-3xl animate-bounce" style={{animationDuration: '2s'}}>{activePetObj.icon}</div>}
                 </div>
                 <button onClick={() => setGameState('defeat')} className="absolute bottom-4 right-4 text-stone-600 hover:text-red-500 text-xs font-bold uppercase">{t('give_up')}</button>
              </div>
           </div>
        )}

        {/* --- VICTORY/DEFEAT --- */}
        {(gameState === 'victory' || gameState === 'defeat') && (
           <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center ${gameState === 'victory' ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
              {gameState === 'victory' ? (
                 <><Trophy size={80} className="text-yellow-400 mb-6 animate-bounce" /><h2 className="text-4xl font-black uppercase text-green-400 mb-2">{t('victory')}</h2></>
              ) : (
                 <><Skull size={80} className="text-red-500 mb-6 animate-pulse" /><h2 className="text-4xl font-black uppercase text-red-500 mb-2">{t('defeat')}</h2><p className="text-stone-300 mb-8">{tData(monster.lore)}</p>
                 {isAdLoading ? <span className="animate-pulse">{t('ad_loading')}</span> : <button onClick={() => handleWatchAd('revive')} className="mb-4 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Video size={20}/> {t('ad_revive')}</button>}
                 </>
              )}
              
              {gameState === 'victory' && (
                <div className="bg-stone-800 p-6 rounded-2xl border-2 border-yellow-500/50 w-full mb-8 mt-4 space-y-2">
                   <div className="flex justify-between items-center border-b border-stone-700 pb-2"><span className="text-xs text-stone-400 uppercase">{t('session_kills')}</span><span className="font-bold text-red-400">{sessionKills}</span></div>
                   <div className="flex justify-between items-center border-b border-stone-700 pb-2"><span className="text-xs text-stone-400 uppercase">{t('gold_won')}</span><span className="font-bold text-yellow-400">+{sessionGoldEarned + gold - gold} 🪙</span></div>
                   <div className="flex justify-between items-center"><span className="text-xs text-stone-400 uppercase">{t('xp_won')}</span><span className="font-bold text-blue-400">+{sessionXpEarned + (selectedTime * 10)} XP</span></div>
                </div>
              )}

              <button onClick={() => {triggerSfx('click'); setGameState('menu')}} className="w-full py-4 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-xl shadow-lg border-b-4 border-stone-900 active:border-b-0 active:translate-y-1 transition-all">{t('return_menu')}</button>
           </div>
        )}

        {/* BOTTOM NAV */}
        {gameState === 'menu' && (
           <div className="absolute bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-800 p-2 flex justify-around items-center h-20 z-30">
              <button onClick={() => {triggerSfx('click'); setActiveTab('shop')}} className={`flex flex-col items-center p-2 w-16 ${activeTab === 'shop' ? 'text-white' : 'text-stone-600'}`}><ShoppingBag size={20}/><span className="text-[9px] uppercase font-bold mt-1">{t('shop')}</span></button>
              <button onClick={() => {triggerSfx('click'); setActiveTab('play')}} className="flex flex-col items-center justify-center w-14 h-14 bg-red-600 rounded-full -mt-8 shadow-[0_0_20px_rgba(220,38,38,0.4)] border-4 border-stone-900 text-white overflow-hidden transform transition active:scale-95"><Sword size={24}/></button>
              <button onClick={() => {triggerSfx('click'); setActiveTab('profile')}} className={`flex flex-col items-center p-2 w-16 ${(activeTab === 'profile' || activeTab === 'zones' || activeTab === 'bestiary') ? 'text-white' : 'text-stone-600'}`}><User size={20}/><span className="text-[9px] uppercase font-bold mt-1">{t('profile')}</span></button>
           </div>
        )}

        {/* DAILY REWARD MODAL */}
        {showDailyReward && (
           <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
              <div className="bg-stone-800 border-2 border-yellow-500 rounded-2xl p-6 text-center shadow-[0_0_50px_rgba(234,179,8,0.2)] animate-in fade-in zoom-in duration-300">
                 <Calendar size={32} className="text-yellow-400 mx-auto mb-4" />
                 <h2 className="text-2xl font-black text-white uppercase mb-2">{t('daily_title')}</h2>
                 <p className="text-stone-400 text-sm mb-6">{t('daily_desc')} <span className="text-orange-500 font-bold">{streakDays} {t('streak')}</span></p>
                 <div className="bg-stone-900 p-4 rounded-xl border border-stone-700 mb-6"><div className="text-3xl font-black text-yellow-400">+100 🪙</div></div>
                 <button onClick={claimDaily} className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-stone-900 font-bold rounded-xl shadow-lg transition">{t('daily_claim')}</button>
              </div>
           </div>
        )}

        {/* SAFE BANNER AD */}
        <SafeAdBanner />

      </div>
    </div>
  );
}
