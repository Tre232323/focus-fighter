import React, { useState, useEffect, useRef, useCallback } from 'react'; 
import { Sword, Skull, Zap, Trophy, Shield, ShoppingBag, Music, User, Lock, BookOpen, Settings, Volume2, Flame, Hourglass, Globe, Hammer, Pickaxe, Video, Battery, EyeOff, X, Menu } from 'lucide-react'; 

// --- RÉCOMPENSES ---
const REWARD_DAILY = 50;
const REWARD_AD_CHEST = 350;

// --- FIREBASE DUMMY (Pour compilation) ---
// @ts-ignore
const firebaseConfig = { projectId: "focus-fighter-rpg" };
// @ts-ignore
const GA_MEASUREMENT_ID = "G-2MY7J82JBN";

// --- AUDIO ENGINE (CORRIGÉ : RETOUR AU GÉNÉRATEUR) ---
// Les sons sont générés mathématiquement (Web Audio API) pour garantir qu'ils marchent partout sans fichiers externes.
const AMBIANCE_SOUNDS: Record<string, string> = {
    rain: '', 
    fire: '',
    wind: '',
    river: '',
    brown: '', 
    space: '', 
};

const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
let audioCtx: AudioContext | null = null;
let ambianceNode: AudioBufferSourceNode | null = null;
let ambianceGain: GainNode | null = null;

const initAudio = () => {
  if (!audioCtx && AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Fonction purement procédurale pour garantir le son
const startProceduralAmbiance = (ctx: AudioContext, type: string, volume: number) => {
    // Nettoyage précédent
    if (ambianceNode) { try { ambianceNode.stop(); } catch(e) {} ambianceNode = null; }

    const bufferSize = ctx.sampleRate * 2; // 2 secondes de buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    
    // Génération de bruit (Brown/White/Pink noise simulation)
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Lissage pour changer la "couleur" du bruit selon le type
        if (type === 'fire') {
             lastOut = (lastOut + (0.02 * white)) / 1.02; // Très grave
        } else if (type === 'wind') {
             lastOut = (lastOut + (0.01 * white)) / 1.01; // Grave
        } else {
             lastOut = (lastOut + (0.05 * white)) / 1.05; // Plus clair (pluie)
        }
        
        data[i] = lastOut * 3.5;
        
        // Effets spécifiques
        if (type === 'rain') data[i] *= 1.5; // Plus fort
        if (type === 'river') data[i] = (lastOut + white * 0.1) * 2; // Mélange
    }

    ambianceNode = ctx.createBufferSource();
    ambianceNode.buffer = buffer;
    ambianceNode.loop = true;
    
    ambianceGain = ctx.createGain();
    
    // Réglage du volume spécifique par type pour équilibrer
    let baseVol = volume;
    if (type === 'fire') baseVol *= 0.8;
    if (type === 'wind') baseVol *= 2.0;
    
    ambianceGain.gain.value = baseVol;

    // Filtres pour sculpter le son
    const filter = ctx.createBiquadFilter();
    if (type === 'rain') { filter.type = 'lowpass'; filter.frequency.value = 800; }
    else if (type === 'fire') { filter.type = 'lowpass'; filter.frequency.value = 500; } // Crépitement sourd
    else if (type === 'wind') { filter.type = 'bandpass'; filter.frequency.value = 400; filter.Q.value = 0.5; }
    else if (type === 'space') { filter.type = 'lowpass'; filter.frequency.value = 100; } // Très sourd
    else { filter.type = 'lowpass'; filter.frequency.value = 1000; }

    ambianceNode.connect(filter);
    filter.connect(ambianceGain);
    ambianceGain.connect(ctx.destination);
    ambianceNode.start();
};

const toggleAmbiance = (enable: boolean, type: string, volume: number) => {
  const ctx = initAudio();
  if (!ctx) return;
  
  if (!enable || type === 'silence') {
      if (ambianceNode) { try { ambianceNode.stop(); } catch(e) {} ambianceNode = null; }
      return;
  }
  
  // On force toujours le procédural pour garantir que ça marche sans fichiers externes
  startProceduralAmbiance(ctx, type, volume);
};

const playSfx = (type: string) => {
  const ctx = initAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

  // Sons synthétiques simples
  if (type === 'attack') { osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(40, now+0.1); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.1); osc.start(now); osc.stop(now+0.1); }
  else if (type === 'coin') { osc.type='sine'; osc.frequency.setValueAtTime(1200, now); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.3); osc.start(now); osc.stop(now+0.3); }
  else if (type === 'win') { osc.type='triangle'; osc.frequency.setValueAtTime(440, now); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now+0.6); osc.start(now); osc.stop(now+0.6); }
  else if (type === 'click') { osc.frequency.setValueAtTime(600, now); gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.05); osc.start(now); osc.stop(now+0.05); }
};

// --- COMPOSANTS UI ---
const SafeAdBanner = () => (
  <div className="bg-black border-t border-stone-800 h-[50px] w-full flex items-center justify-center shrink-0 z-50">
     <div className="text-stone-600 text-[10px] uppercase tracking-widest">Publicité (ID: ...3733)</div>
  </div>
);

const MonsterAvatar = ({ id, color, isBoss }: { id: string, color: string, isBoss: boolean }) => {
  const glow = isBoss ? 'drop-shadow(0 0 15px red)' : '';
  return (
    <div className={`w-32 h-32 flex items-center justify-center transition-all duration-300 ${isBoss ? 'scale-125' : ''}`} style={{ filter: glow }}>
      <svg viewBox="0 0 100 100" className={`w-full h-full ${color}`}>
        {/* Formes simples pour les monstres */}
        {id.includes('slime') && <path d="M20,80 Q10,80 10,70 Q10,40 50,40 Q90,40 90,70 Q90,80 80,80 Z" fill="currentColor" opacity="0.9" />}
        {id.includes('goblin') && <circle cx="50" cy="50" r="35" fill="currentColor" opacity="0.9" />}
        {!['slime','goblin'].some(k => id.includes(k)) && <circle cx="50" cy="50" r="35" fill="currentColor" opacity="0.7" />}
        <circle cx="35" cy="45" r="5" fill="white" />
        <circle cx="65" cy="45" r="5" fill="white" />
        <circle cx="35" cy="45" r="2" fill="black" />
        <circle cx="65" cy="45" r="2" fill="black" />
      </svg>
    </div>
  );
};

// --- DATA ---
type Lang = 'fr' | 'en';
const TEXTS = {
  fr: {
    play: "Jouer", shop: "Boutique", profile: "Profil", bestiary: "Bestiaire", zones: "Carte",
    settings: "Paramètres", sfx: "Bruitages", ambiance: "Ambiance",
    minutes: "Minutes", backpack: "Sac à dos", weapons: "Armes", potions: "Potions", pets: "Compagnons",
    level: "Niveau", xp: "XP", gold: "Or", kills: "Kills", hours: "Heures", streak: "Série",
    hp: "PV", damage: "Dégâts", cost: "Coût", owned: "Acquis", equipped: "Équipé",
    victory: "Session Terminée !", defeat: "Échec", gold_won: "Or Gagné", xp_won: "XP Gagné",
    return_menu: "Retour au menu", give_up: "Abandonner", focus_active: "Focus Actif",
    daily_title: "Bonus Quotidien", daily_desc: "Série actuelle :", daily_claim: "Récupérer",
    save_export: "Exporter Sauvegarde", save_import: "Importer Sauvegarde",
    save_copied: "Copié !", save_error: "Erreur", save_loaded: "Chargé !",
    reset_data: "Réinitialiser", lang_select: "Langue",
    str: "Force", greed: "Avarice", wis: "Sagesse", points: "Points",
    ad_chest: "Coffre Pub", ad_chest_desc: `Vidéo pour ${REWARD_AD_CHEST} 🪙`,
    ad_revive: "Ressusciter", ad_error: "Erreur Pub",
    youtube_suggest: "Suggestion: Mettez votre musique Lo-fi en fond !",
    monster_name: "Monstre", monster_lore: "Une créature hostile.",
    unknown: "Inconnu", unlock: "???"
  },
  en: {
    play: "Play", shop: "Shop", profile: "Profile", bestiary: "Bestiary", zones: "Map",
    settings: "Settings", sfx: "Sound FX", ambiance: "Ambiance",
    minutes: "Minutes", backpack: "Backpack", weapons: "Weapons", potions: "Potions", pets: "Pets",
    level: "Level", xp: "XP", gold: "Gold", kills: "Kills", hours: "Hours", streak: "Streak",
    hp: "HP", damage: "Damage", cost: "Cost", owned: "Owned", equipped: "Equipped",
    victory: "Session Complete!", defeat: "Defeat", gold_won: "Gold Won", xp_won: "XP Won",
    return_menu: "Return to Menu", give_up: "Give Up", focus_active: "Focus Active",
    daily_title: "Daily Bonus", daily_desc: "Current Streak:", daily_claim: "Claim",
    save_export: "Export Save", save_import: "Import Save",
    save_copied: "Copied!", save_error: "Error", save_loaded: "Loaded!",
    reset_data: "Reset Data", lang_select: "Language",
    str: "Strength", greed: "Greed", wis: "Wisdom", points: "Points",
    ad_chest: "Ad Chest", ad_chest_desc: `Watch for ${REWARD_AD_CHEST} 🪙`,
    ad_revive: "Revive", ad_error: "Ad Error",
    youtube_suggest: "Tip: Play your Lofi music in background!",
    monster_name: "Monster", monster_lore: "A hostile creature.",
    unknown: "Unknown", unlock: "???"
  }
};

const ZONES = [
  { id: 'forest', cost: 0, mult: 1, monsters: ['slime', 'rat', 'wolf', 'goblin', 'treant'], color: 'from-emerald-900 to-stone-900', icon: '🌲' },
  { id: 'catacombs', cost: 2000, mult: 1.5, monsters: ['skeleton', 'bat_mob', 'ghost_mob', 'zombie', 'necromancer'], color: 'from-slate-900 to-black', icon: '☠️' },
  { id: 'volcano', cost: 8000, mult: 2.5, monsters: ['imp', 'fire_elemental', 'salamander', 'golem', 'dragon'], color: 'from-red-900 to-orange-900', icon: '🌋' },
  { id: 'void', cost: 30000, mult: 5, monsters: ['shadow', 'beholder', 'cultist', 'demon'], color: 'from-purple-900 to-black', icon: '🌌' },
];

const MONSTERS = [
    // Liste simplifiée pour éviter les erreurs de type, les noms sont génériques dans cette version
    { id: 'slime', baseHp: 300, xp: 25, color: "text-green-500" },
    { id: 'rat', baseHp: 450, xp: 35, color: "text-stone-500" },
    { id: 'wolf', baseHp: 600, xp: 50, color: "text-stone-400" },
    { id: 'goblin', baseHp: 800, xp: 60, color: "text-green-700" },
    { id: 'treant', baseHp: 1500, xp: 100, color: "text-green-900" },
    { id: 'skeleton', baseHp: 2000, xp: 150, color: "text-stone-300" },
    { id: 'bat_mob', baseHp: 1800, xp: 140, color: "text-purple-400" },
    { id: 'ghost_mob', baseHp: 2500, xp: 180, color: "text-cyan-300" },
    { id: 'zombie', baseHp: 3000, xp: 200, color: "text-green-800" },
    { id: 'necromancer', baseHp: 4000, xp: 300, color: "text-purple-600" },
    { id: 'imp', baseHp: 5000, xp: 400, color: "text-red-400" },
    { id: 'fire_elemental', baseHp: 7000, xp: 500, color: "text-orange-500" },
    { id: 'salamander', baseHp: 8500, xp: 600, color: "text-orange-400" },
    { id: 'golem', baseHp: 12000, xp: 800, color: "text-stone-600" },
    { id: 'dragon', baseHp: 20000, xp: 1200, color: "text-red-600" },
    { id: 'shadow', baseHp: 30000, xp: 1500, color: "text-gray-900" },
    { id: 'beholder', baseHp: 45000, xp: 2000, color: "text-purple-300" },
    { id: 'cultist', baseHp: 60000, xp: 2500, color: "text-red-900" },
    { id: 'demon', baseHp: 250000, xp: 10000, color: "text-red-950" }
];

const WEAPONS = [
  { id: 'hands', name: { fr: "Mains Nues", en: "Bare Hands" }, damage: 5, cost: 0, icon: "✊" },
  { id: 'stick', name: { fr: "Bâton", en: "Stick" }, damage: 15, cost: 150, icon: "🪵" },
  { id: 'dagger', name: { fr: "Dague", en: "Dagger" }, damage: 35, cost: 500, icon: "🗡️" },
  { id: 'bat', name: { fr: "Batte", en: "Bat" }, damage: 60, cost: 1200, icon: "🏏" },
  { id: 'sword', name: { fr: "Épée", en: "Sword" }, damage: 100, cost: 3000, icon: "⚔️" },
  { id: 'axe', name: { fr: "Hache", en: "Axe" }, damage: 180, cost: 6000, icon: "🪓" },
  { id: 'katana', name: { fr: "Katana", en: "Katana" }, damage: 300, cost: 12000, icon: "🎌" },
  { id: 'hammer', name: { fr: "Marteau", en: "Hammer" }, damage: 500, cost: 25000, icon: "🔨" },
  { id: 'rune', name: { fr: "Lame Runique", en: "Rune Blade" }, damage: 1000, cost: 60000, icon: "💠" },
  { id: 'excalibur', name: { fr: "Excalibur", en: "Excalibur" }, damage: 2500, cost: 150000, icon: "✨" },
  { id: 'scythe', name: { fr: "Faux", en: "Scythe" }, damage: 5000, cost: 400000, icon: "☠️" },
  { id: 'god', name: { fr: "Godslayer", en: "Godslayer" }, damage: 12000, cost: 1000000, icon: "⚡" },
];

const ITEMS = [
  { id: 'potion_gold', type: 'buff', name: { fr: "Potion Caféine", en: "Caffeine Potion" }, cost: 150, icon: "☕", effect: { fr: "Double l'Or", en: "Double Gold" } },
  { id: 'potion_freeze', type: 'passive', name: { fr: "Sablier Stase", en: "Stasis Hourglass" }, cost: 400, icon: "⏳", effect: { fr: "Sauve 1 fois", en: "Saves once" } },
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
  const [ambianceVolume, setAmbianceVolume] = useStickyState(0.5, 'ff_ambiance_volume');

  // FIX: Types de TabType
  type TabType = 'play' | 'shop' | 'profile' | 'zones' | 'bestiary'; 
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'victory' | 'defeat'>('menu');
  const [activeTab, setActiveTab] = useState<TabType>('play');
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

  // MONSTRES UNIQUES
  const [sessionMonsterQueue, setSessionMonsterQueue] = useState<string[]>([]);
  const [currentMonsterId, setCurrentMonsterId] = useState<string>('slime');
  
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
  
  const weapon = WEAPONS[currentWeapon];
  const weaponLvl = weaponLevels[currentWeapon] || 0;
  const activePetObj = PETS.find(p => p.id === equippedPet);
  const zoneObj = ZONES.find(z => z.id === currentZone) || ZONES[0];
  const currentMonster = MONSTERS.find(m => m.id === currentMonsterId) || MONSTERS[0];

  const getWeaponDamage = () => Math.floor(weapon.damage * (1 + (weaponLvl * 0.2))); 
  const multDamage = (1 + (talents.str * 0.05));
  const multGold = (1 + (talents.greed * 0.05)) * zoneObj.mult * (1 + (combo * 0.1));
  const multXp = (1 + (talents.wis * 0.05)) * zoneObj.mult;

  const t = (key: keyof typeof TEXTS.fr) => TEXTS[lang][key];
  const tData = (data: { fr: string, en: string }) => data[lang];

  // AUDIO UPDATE
  useEffect(() => {
    if (ambianceGain && ambianceGain.gain) {
      ambianceGain.gain.value = ambianceVolume;
    }
  }, [ambianceVolume]);

  useEffect(() => {
    if (gameState === 'playing' && ambianceEnabled) {
      toggleAmbiance(true, AMBIANCES[currentAmbiance].id, ambianceVolume);
    } else {
      toggleAmbiance(false, 'silence', ambianceVolume);
    }
    return () => toggleAmbiance(false, 'silence', ambianceVolume);
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

  const handleWatchAd = (rewardType: 'chest' | 'revive') => {
    if (isAdLoading) return;
    setIsAdLoading(true);
    const simulateAdCall = new Promise((resolve, reject) => {
      setTimeout(() => { Math.random() > 0.1 ? resolve(true) : reject("AdMob Error"); }, 2000);
    });
    simulateAdCall
      .then(() => {
        triggerSfx('ad');
        if (rewardType === 'chest') {
          setGold(g => g + REWARD_AD_CHEST);
          triggerSfx('coin');
          alert(`Récompense reçue : ${REWARD_AD_CHEST} Or !`);
        } else if (rewardType === 'revive') {
          setGameState('playing');
          setMonsterCurrentHp(currentMonster.baseHp); 
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
    if (lastLoginDate !== today && gameState === 'menu') setShowDailyReward(true);
  }, [lastLoginDate, gameState]); 

  const claimDaily = () => { 
    triggerSfx('coin');
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastLoginDate === yesterday.toDateString()) setStreakDays(s => s + 1);
    else if (lastLoginDate !== today) setStreakDays(1);
    setLastLoginDate(today);
    setGold(g => g + REWARD_DAILY);
    setShowDailyReward(false);
  };

  const pickMonsterForSession = (isBoss: boolean) => {
    if (isBoss) return MONSTERS.find(m => m.id === zoneObj.monsters[zoneObj.monsters.length - 1])!.id;
    if (sessionMonsterQueue.length === 0) {
      const allZoneMonsters = MONSTERS.filter(m => zoneObj.monsters.includes(m.id));
      const bossId = zoneObj.monsters[zoneObj.monsters.length - 1];
      const availableMonsters = allZoneMonsters.filter(m => m.id !== bossId).map(m => m.id);
      setSessionMonsterQueue(availableMonsters);
      return availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
    }
    const randomIndex = Math.floor(Math.random() * sessionMonsterQueue.length);
    const selectedMonsterId = sessionMonsterQueue[randomIndex];
    setSessionMonsterQueue(prev => prev.filter((_, index) => index !== randomIndex));
    return selectedMonsterId;
  };

  const spawnMonster = (isFirst = false) => {
    let type: 'none' | 'gold' | 'xp' | 'boss' = 'none';
    if (!isFirst && sessionMonsterQueue.length === 0 && (sessionKills + 1) % 10 !== 0) {
        const allZoneMonsters = MONSTERS.filter(m => zoneObj.monsters.includes(m.id));
        const bossId = zoneObj.monsters[zoneObj.monsters.length - 1];
        const availableMonsters = allZoneMonsters.filter(m => m.id !== bossId).map(m => m.id);
        setSessionMonsterQueue(availableMonsters);
    }
    if (!isFirst && (sessionKills + 1) % 10 === 0) { type = 'boss'; triggerSfx('boss'); } 
    else { const roll = Math.random(); if (roll > 0.95) type = 'gold'; else if (roll > 0.90) type = 'xp'; }
    setShinyType(type);
    let nextId = pickMonsterForSession(type === 'boss');
    setCurrentMonsterId(nextId);
    const nextMonster = MONSTERS.find(m => m.id === nextId) || MONSTERS[0];
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
    const allZoneMonsters = ZONES.find(z => z.id === currentZone)?.monsters.slice(0, -1);
    setSessionMonsterQueue(allZoneMonsters || []); 
    spawnMonster(true);
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState === 'playing' && !isFrozen) {
      comboIntervalRef.current = window.setInterval(() => {
        setComboTimer(prev => { if (prev <= 0) { setCombo(0); return 0; } return prev - 1; });
      }, 100);
    }
    return () => { if (comboIntervalRef.current) clearInterval(comboIntervalRef.current); };
  }, [gameState, isFrozen]);

  useEffect(() => {
    if (gameState === 'playing' && !isFrozen) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { endBattle(true); return 0; }
          setIsAttacking(true); setTimeout(() => setIsAttacking(false), 150);
          setIsHit(true); setTimeout(() => setIsHit(false), 200);
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
            if (newHp <= 0) { triggerSfx('kill'); handleMonsterKill(); return 99999; }
            return newHp;
          });
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, isFrozen, currentWeapon, weaponLevels, talents, equippedPet, currentMonsterId]);

  const handleMonsterKill = () => {
    const killedMonster = currentMonster;
    setSessionKills(k => k + 1);
    setCombo(c => Math.min(c + 1, 10)); setComboTimer(50); 
    let g = killedMonster.xp; let x = killedMonster.xp; 
    if (shinyType === 'boss') { g *= 10; x *= 10; } else if (shinyType === 'gold') g *= 5; else if (shinyType === 'xp') x *= 5;
    if (activeBuff === 'potion_gold') g *= 2;
    if (activePetObj?.type === 'gold') g *= (1 + activePetObj.val);
    if (activePetObj?.type === 'xp') x *= (1 + activePetObj.val);
    g *= multGold; x *= multXp;
    setSessionGoldEarned(cur => cur + Math.floor(g));
    setSessionXpEarned(cur => cur + Math.floor(x));
    if (!bestiary.includes(killedMonster.id)) { setBestiary(b => [...b, killedMonster.id]); }
    spawnMonster(false);
  };

  const endBattle = (victory: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (freezeIntervalRef.current) clearInterval(freezeIntervalRef.current);
    if (comboIntervalRef.current) clearInterval(comboIntervalRef.current);
    setIsFrozen(false);
    if (victory) {
      triggerSfx('win');
      const totalXpGained = sessionXpEarned + (selectedTime * 10);
      let newXp = playerXp + totalXpGained;
      let newLevel = playerLevel;
      while (newXp >= newLevel * 100) { newXp -= newLevel * 100; newLevel++; }
      setGold(g => g + sessionGoldEarned);
      setMonstersKilled(k => k + sessionKills);
      setTotalMinutes(m => m + selectedTime);
      setPlayerXp(newXp);
      setPlayerLevel(newLevel);
      setGameState('victory');
    } else {
      triggerSfx('lose');
      setGameState('defeat');
    }
    setActiveBuff(null);
  };

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

  const updateTalent = (key: 'str' | 'greed' | 'wis') => {
      const availableTalents = Math.max(0, (playerLevel - 1) - (talents.str + talents.greed + talents.wis));
      if (availableTalents > 0) {
          setTalents(t=>({...t, [key]:t[key] + 1}));
      }
  };

  // --- RENDER ---
  const availableTalents = Math.max(0, (playerLevel - 1) - (talents.str + talents.greed + talents.wis));
  const progress = (playerXp / (playerLevel * 100)) * 100;

  return (
    <div className="flex justify-center items-center min-h-screen bg-stone-950 font-mono text-white p-0 select-none fixed inset-0">
      <div className={`w-full h-full flex flex-col bg-stone-900 overflow-hidden relative bg-gradient-to-br ${zoneObj.color}`}>
        
        {/* HEADER */}
        <div className="bg-stone-900 p-3 border-b border-stone-800 z-20 flex justify-between items-center shrink-0">
           <div className="flex items-center space-x-2">
               {/* LOGO */}
              <img src="Gemini_Generated_Image_4fbxlw4fbxlw4fbx.jpg" alt="Logo" className="w-8 h-8 rounded-lg shadow-md border border-red-800" />
              
              <div className="w-8 h-8 bg-stone-700 rounded-full flex items-center justify-center font-bold text-xs border border-stone-500 relative">
                 {playerLevel}
                 {streakDays > 0 && <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center border border-stone-900"><Flame size={8} fill="white" /></div>}
              </div>
              <div className="flex flex-col w-20">
                 <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${progress}%`}}></div></div>
                 <span className="text-[9px] text-stone-500 mt-0.5">{Math.floor(playerXp)}/{playerLevel * 100} {t('xp')}</span>
              </div>
           </div>
           <div className="flex items-center space-x-2">
             <div className="flex items-center bg-stone-800 px-2 py-1 rounded-lg border border-stone-700">
               <span className="text-xs mr-1">🪙</span><span className="text-xs font-bold text-yellow-100">{Math.floor(gold)}</span>
             </div>
             <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 bg-stone-800 rounded-full text-stone-400 hover:text-white border border-stone-700"><Settings size={16}/></button>
           </div>
        </div>

        {/* SUB-NAV FIXE */}
        {(activeTab === 'profile' || activeTab === 'bestiary' || activeTab === 'zones') && gameState === 'menu' && (
           <div className="bg-stone-900 p-2 border-b border-stone-800 shrink-0 flex gap-2 overflow-x-auto">
                <button onClick={() => setActiveTab('zones')} className={`flex-1 py-2 text-xs font-bold uppercase rounded px-2 whitespace-nowrap ${activeTab === 'zones' ? 'bg-indigo-600 text-white' : 'text-stone-500'}`}>{t('zones')}</button>
                <button onClick={() => setActiveTab('profile')} className={`flex-1 py-2 text-xs font-bold uppercase rounded px-2 whitespace-nowrap ${activeTab === 'profile' ? 'bg-stone-600 text-white' : 'text-stone-500'}`}>{t('profile')}</button>
                <button onClick={() => setActiveTab('bestiary')} className={`flex-1 py-2 text-xs font-bold uppercase rounded px-2 whitespace-nowrap ${activeTab === 'bestiary' ? 'bg-stone-600 text-white' : 'text-stone-500'}`}>{t('bestiary')}</button>
           </div>
        )}

        {/* SETTINGS */}
        {showSettings && (
           <div className="absolute top-14 right-4 z-50 bg-stone-800 border border-stone-600 rounded-xl p-4 shadow-xl w-64 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-sm">{t('settings')}</h3><button onClick={() => setShowSettings(false)}><X size={16}/></button></div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center"><div className="flex items-center text-xs text-stone-300"><Globe size={14} className="mr-2"/> {t('lang_select')}</div><button onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')} className="text-xs font-bold bg-stone-700 px-2 py-1 rounded">{lang.toUpperCase()}</button></div>
                 <div className="flex justify-between items-center"><div className="flex items-center text-xs text-stone-300"><Volume2 size={14} className="mr-2"/> {t('sfx')}</div><button onClick={() => setSfxEnabled(!sfxEnabled)} className={`w-8 h-4 rounded-full relative transition-colors ${sfxEnabled ? 'bg-green-500' : 'bg-stone-600'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${sfxEnabled ? 'left-4.5' : 'left-0.5'}`}></div></button></div>
                 
                 <div className="pt-2 border-t border-stone-700 mt-2">
                    <div className="flex justify-between items-center mb-2">
                       <div className="flex items-center text-xs text-stone-300"><Music size={14} className="mr-2"/> {t('ambiance')}</div>
                       <button onClick={() => setAmbianceEnabled(!ambianceEnabled)} className={`w-8 h-4 rounded-full relative transition-colors ${ambianceEnabled ? 'bg-green-500' : 'bg-stone-600'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${ambianceEnabled ? 'left-4.5' : 'left-0.5'}`}></div></button>
                    </div>
                    {ambianceEnabled && (
                        <input type="range" min="0" max="1" step="0.05" value={ambianceVolume} onChange={(e) => setAmbianceVolume(parseFloat(e.target.value))} className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer range-sm" />
                    )}
                 </div>
              </div>
           </div>
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto pb-24 relative"> 
            {gameState === 'menu' && (
                <>
                    {activeTab === 'play' && (
                        <div className="p-6 flex flex-col items-center">
                            <div className={`w-full h-40 rounded-xl flex flex-col items-center justify-center border-4 border-stone-700 relative overflow-hidden mb-6 bg-black/30`}>
                                <div className="text-6xl mb-2">{zoneObj.icon}</div>
                                <div className="font-black text-2xl uppercase tracking-widest text-white shadow-black drop-shadow-md text-center">{tData(MONSTERS.find(m => m.id === zoneObj.monsters[0])?.name || {fr: 'Zone', en: 'Zone'})}</div> 
                                {/* FIX: Utilisation d'un nom de monstre par défaut pour éviter l'erreur si la zone est vide */}
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full mb-4">
                                {[10, 25, 45, 60].map(time => (
                                    <button key={time} onClick={() => startBattle(time)} className="bg-stone-800 hover:bg-red-900/30 border-2 border-stone-700 py-3 rounded-xl flex flex-col items-center group transition-colors">
                                        <span className="text-2xl font-black text-stone-200 group-hover:text-white">{time}</span><span className="text-[9px] text-stone-500 font-bold uppercase">{t('minutes')}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="w-full space-y-4">
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {AMBIANCES.map((amb, idx) => (
                                        <button key={idx} onClick={() => setCurrentAmbiance(idx)} className={`px-3 py-2 rounded-lg border text-xs flex items-center whitespace-nowrap transition-colors ${currentAmbiance === idx ? 'bg-stone-700 border-stone-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-500'}`}><span className="mr-1">{amb.icon}</span> {tData(amb.name)}</button>
                                    ))}
                                </div>
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
                            
                            {shopTab === 'weapons' && <div className="space-y-2">{WEAPONS.map((w, idx) => {
                                const lvl = weaponLevels[idx] || 0;
                                const dmg = Math.floor(w.damage * (1 + (lvl * 0.2)));
                                const upgCost = w.cost > 0 ? Math.floor(w.cost * 0.5 * (lvl + 1)) : 100 * (lvl + 1);
                                const isOwned = currentWeapon >= idx; 
                                return (
                                    <div key={idx} className={`w-full p-3 rounded-xl border flex flex-col gap-2 ${currentWeapon === idx ? 'bg-green-900/20 border-green-500/50' : 'bg-stone-800 border-stone-700'}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="text-xl w-10 h-10 bg-stone-900 rounded flex items-center justify-center relative">{w.icon}{lvl > 0 && <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] rounded px-1">+{lvl}</div>}</div>
                                                <div><div className="font-bold text-sm text-stone-200">{tData(w.name)}</div><div className="text-[10px] text-stone-500">{t('damage')}: {dmg}</div></div>
                                            </div>
                                            {isOwned ? (currentWeapon === idx ? <div className="w-2 h-2 bg-green-500 rounded-full"></div> : <button onClick={() => setData(d => ({...d, currentWeapon: idx}))} className="text-[10px] bg-stone-700 px-2 py-1 rounded text-stone-300">{t('equipped')}</button>) : <button onClick={() => {if(gold>=w.cost){setGold(g=>g-w.cost); setCurrentWeapon(idx)}}} className="text-yellow-400 text-xs font-bold border border-yellow-500/30 px-2 py-1 rounded">{w.cost} 🪙</button>}
                                        </div>
                                        {isOwned && <button onClick={() => upgradeWeapon(idx)} className="flex items-center justify-center gap-2 bg-stone-900/50 hover:bg-stone-900 p-2 rounded text-[10px] text-stone-400 border border-dashed border-stone-700"><Hammer size={10} /> {t('upgrade')} (+20%) <span className="text-yellow-500 font-bold">{upgCost} 🪙</span></button>}
                                    </div>
                                )
                            })}</div>}
                        </div>
                    )}

                    {activeTab === 'zones' && (
                        <div className="p-4 space-y-3">
                           {ZONES.map(z => {
                              const isUnlocked = unlockedZones.includes(z.id);
                              const isCurrent = currentZone === z.id;
                              return (
                                 <div key={z.id} onClick={() => {if(isUnlocked) setData(d => ({...d, currentZone: z.id}))}} className={`relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${isCurrent ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-stone-700'} ${!isUnlocked && 'opacity-70 grayscale'}`}>
                                    <div className={`absolute inset-0 bg-gradient-to-r ${z.color} opacity-50`}></div>
                                    <div className="relative p-4 flex justify-between items-center">
                                       <div className="flex items-center gap-4"><div className="text-3xl">{z.icon}</div><div><div className="font-bold text-sm text-white uppercase">{tData(MONSTERS.find(m => m.id === z.monsters[0])?.name || {fr: 'Zone', en: 'Zone'})}</div><div className="text-[10px] text-stone-300 font-bold">Bonus: x{z.mult}</div></div></div>
                                       {isUnlocked ? (isCurrent ? <div className="bg-indigo-500 text-white text-[10px] px-2 py-1 rounded font-bold">ACTUEL</div> : <div className="text-xs text-stone-400 flex items-center">{t('travel')} <ArrowRight size={12} className="ml-1"/></div>) : <div className="bg-stone-900/80 hover:bg-black text-yellow-400 text-xs px-3 py-2 rounded border border-yellow-500/30 flex items-center gap-2 font-bold"><Lock size={12}/> {z.cost}</div>}
                                    </div>
                                 </div>
                              )
                           })}
                        </div>
                    )}

                    {activeTab === 'profile' && (
                       <div className="p-4 space-y-4">
                          <div className="bg-stone-800 p-4 rounded-xl border border-stone-700">
                             <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold flex items-center"><Pickaxe size={14} className="mr-2"/> {t('talents')}</h3><span className="text-xs text-stone-400">{t('points')}: <span className="text-white font-bold">{availableTalents}</span></span></div>
                             <div className="space-y-2">
                                <div className="flex justify-between items-center bg-stone-900/50 p-2 rounded-lg"><div className="flex items-center gap-2"><Sword size={14} className="text-red-400"/><span className="text-xs">{t('str')}</span></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-stone-400">{talents.str}</span><button disabled={availableTalents===0} onClick={()=>updateTalent('str')} className={`w-5 h-5 rounded flex items-center justify-center text-xs ${availableTalents>0?'bg-blue-600':'bg-stone-700'}`}>+</button></div></div>
                                <div className="flex justify-between items-center bg-stone-900/50 p-2 rounded-lg"><div className="flex items-center gap-2"><ShoppingBag size={14} className="text-yellow-400"/><span className="text-xs">{t('greed')}</span></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-stone-400">{talents.greed}</span><button disabled={availableTalents===0} onClick={()=>updateTalent('greed')} className={`w-5 h-5 rounded flex items-center justify-center text-xs ${availableTalents>0?'bg-blue-600':'bg-stone-700'}`}>+</button></div></div>
                                <div className="flex justify-between items-center bg-stone-900/50 p-2 rounded-lg"><div className="flex items-center gap-2"><BookOpen size={14} className="text-blue-400"/><span className="text-xs">{t('wis')}</span></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-stone-400">{talents.wis}</span><button disabled={availableTalents===0} onClick={()=>updateTalent('wis')} className={`w-5 h-5 rounded flex items-center justify-center text-xs ${availableTalents>0?'bg-blue-600':'bg-stone-700'}`}>+</button></div></div>
                             </div>
                          </div>
                          <div className="mt-8 text-center"><button onClick={() => {if(confirm(t('reset_confirm'))) {window.localStorage.clear(); window.location.reload();}}} className="text-xs text-red-900 hover:text-red-500">{t('reset_data')}</button></div>
                       </div>
                    )}
                </>
            )}

            {gameState === 'playing' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative h-full">
                    {/* GIVE UP BUTTON - FIX PLACEMENT */}
                    <button onClick={() => setGameState('defeat')} className="absolute top-4 right-4 bg-stone-800/80 p-2 rounded text-stone-400 hover:text-white border border-stone-700 z-50 text-xs font-bold uppercase">{t('give_up')}</button>
                    
                    <div className="text-6xl font-black text-white tracking-widest font-mono mb-8">{formatTime(timeLeft)}</div>
                    
                    <div className="relative mb-8">
                        <MonsterAvatar id={monster.id} color={monster.color} isBoss={shinyType === 'boss'} />
                        {isHit && <div className={`absolute top-0 right-0 font-black text-4xl animate-ping select-none ${isCrit ? 'text-yellow-400 scale-150' : 'text-red-500'}`}>-{lastDamage}</div>}
                    </div>

                    <div className="w-full max-w-xs bg-stone-800 rounded-full h-4 border border-stone-600 overflow-hidden relative mb-2">
                        <div className={`h-full transition-all duration-300 ${monster.color.replace('text-','bg-')}`} style={{ width: `${Math.min(100, (monsterCurrentHp / (monster.baseHp * (shinyType==='boss'?5:1) * (1+(playerLevel*0.05)))) * 100)}%` }}></div>
                    </div>
                    <div className="text-xs font-bold text-stone-400 mb-8">{Math.ceil(monsterCurrentHp)} / {Math.ceil(monster.baseHp * (shinyType==='boss'?5:1) * (1+(playerLevel*0.05)))}</div>

                    <div className="text-6xl opacity-50">{weapon.icon}</div>
                    <div className="text-stone-500 text-xs mt-4 uppercase flex items-center animate-pulse text-red-400"><Shield size={12} className="mr-1"/> {t('focus_active')}</div>
                </div>
            )}

            {(gameState === 'victory' || gameState === 'defeat') && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    {gameState === 'victory' ? (
                        <><Trophy size={80} className="text-yellow-400 mb-6 animate-bounce" /><h2 className="text-4xl font-black uppercase text-green-400 mb-2">{t('victory')}</h2></>
                    ) : (
                        <><Skull size={80} className="text-red-500 mb-6 animate-pulse" /><h2 className="text-4xl font-black uppercase text-red-500 mb-2">{t('defeat')}</h2><p className="text-stone-300 mb-8">{tData(monster.lore)}</p>
                        <button onClick={() => handleWatchAd('revive')} className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 mb-4 text-white"><Video size={20}/> {t('ad_revive')}</button>
                        </>
                    )}
                    <div className="bg-stone-800 p-6 rounded-2xl border-2 border-yellow-500/50 w-full mb-8 mt-4 space-y-2">
                        <div className="flex justify-between items-center border-b border-stone-700 pb-2"><span className="text-xs text-stone-400 uppercase">{t('session_kills')}</span><span className="font-bold text-red-400">{sessionKills}</span></div>
                        <div className="flex justify-between items-center border-b border-stone-700 pb-2"><span className="text-xs text-stone-400 uppercase">{t('gold_won')}</span><span className="font-bold text-yellow-400">+{sessionGoldEarned} 🪙</span></div>
                        <div className="flex justify-between items-center"><span className="text-xs text-stone-400 uppercase">{t('xp_won')}</span><span className="font-bold text-blue-400">+{sessionXpEarned} XP</span></div>
                    </div>
                    <button onClick={() => {triggerSfx('click'); setGameState('menu')}} className="w-full py-4 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-xl shadow-lg border-b-4 border-stone-900 active:border-b-0 active:translate-y-1 transition-all">{t('return_menu')}</button>
                </div>
            )}
        </div>

        {/* BOTTOM NAV */}
        {gameState === 'menu' && (
           <div className="absolute bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-800 p-2 flex justify-around items-center h-20 z-30 shrink-0">
              <button onClick={() => {triggerSfx('click'); setActiveTab('shop')}} className={`flex flex-col items-center p-2 w-16 ${activeTab === 'shop' ? 'text-white' : 'text-stone-600'}`}><ShoppingBag size={20}/><span className="text-[9px] uppercase font-bold mt-1">{t('shop')}</span></button>
              <button onClick={() => {triggerSfx('click'); setActiveTab('play')}} className="flex flex-col items-center justify-center w-14 h-14 bg-red-600 rounded-full -mt-8 shadow-[0_0_20px_rgba(220,38,38,0.4)] border-4 border-stone-900 text-white overflow-hidden transform transition active:scale-95"><Sword size={24}/></button>
              <button onClick={() => {triggerSfx('click'); setActiveTab('profile')}} className={`flex flex-col items-center p-2 w-16 ${(activeTab === 'profile' || activeTab === 'bestiary' || activeTab === 'zones') ? 'text-white' : 'text-stone-600'}`}><User size={20}/><span className="text-[9px] uppercase font-bold mt-1">{t('profile')}</span></button>
           </div>
        )}

        {/* DAILY REWARD MODAL */}
        {showDailyReward && (
           <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
              <div className="bg-stone-800 border-2 border-yellow-500 rounded-2xl p-6 text-center shadow-[0_0_50px_rgba(234,179,8,0.2)] animate-in fade-in zoom-in duration-300">
                 <div className="flex justify-center mb-4 text-yellow-400"><Calendar size={48} /></div> {/* FIX TS6133: Utilisation explicite de Calendar */}
                 <h2 className="text-2xl font-black text-white uppercase mb-2">{t('daily_title')}</h2>
                 <p className="text-stone-400 text-sm mb-6">{t('daily_desc')} <span className="text-orange-500 font-bold">{streakDays} {t('streak')}</span></p>
                 <div className="bg-stone-900 p-4 rounded-xl border border-stone-700 mb-6"><div className="text-3xl font-black text-yellow-400">+{REWARD_DAILY} 🪙</div></div>
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
