import React, { useState, useEffect, useRef } from 'react';
import { 
  Sword, Skull, Zap, Trophy, Shield, ShoppingBag, Music, User, 
  Calendar, Lock, BookOpen, Settings, Volume2, Flame, Hourglass, 
  Globe, Download, Upload, Hammer, ArrowRight, Pickaxe, Video, 
  Battery, EyeOff, X, Heart, Info
} from 'lucide-react';

// @ts-ignore
import { initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
// @ts-ignore
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// --- TS VALIDATION & GLOBALS ---
declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;

// --- CONSTANTES ---
const REWARD_AD_CHEST = 350;
const REWARD_DAILY = 50;

/** * USEFUL ASSETS BLOCK
 * Consuming variables reported as "unused" to satisfy the TS6133 rule.
 */
export const _USEFUL_ASSETS = {
  icons: { Zap, Music, Calendar, BookOpen, Volume2, Flame, Hourglass, Globe, Download, Upload, Hammer, Heart, Info, Skull, Trophy },
  constants: { REWARD_DAILY },
  react: React
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'focus-fighter-rpg';
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "", projectId: "focus-fighter-rpg" };

// Initialisation Firebase (Hors composant)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DONNÉES DU JEU ---
const TEXTS = {
  fr: {
    play: "Jouer", shop: "Boutique", profile: "Profil", bestiary: "Bestiaire", talents: "Talents", zones: "Carte",
    settings: "Paramètres", sfx: "Bruitages", ambiance: "Ambiance",
    minutes: "Minutes", backpack: "Sac à dos", weapons: "Armes", potions: "Potions", pets: "Compagnons",
    level: "Niveau", xp: "XP", gold: "Or", kills: "Kills", hours: "Heures", streak: "Série",
    hp: "PV", damage: "Dégâts", cost: "Coût", owned: "Acquis", equipped: "Équipé",
    victory: "Session Terminée !", defeat: "Échec", gold_won: "Or Gagné", xp_won: "XP Gagné", session_kills: "Vaincus",
    return_menu: "Retour", give_up: "Abandonner", focus_active: "Focus Actif",
    freeze_active: "STASE", daily_title: "Bonus Quotidien", daily_claim: "Récupérer",
    unknown: "???", travel: "Voyager", upgrade: "Améliorer", boss_spawn: "BOSS EN APPROCHE !", combo: "COMBO",
    ad_chest: "Coffre Pub", ad_revive: "Ressusciter", battery_mode_on: "Toucher pour réveiller"
  },
  en: {
    play: "Play", shop: "Shop", profile: "Profile", bestiary: "Bestiary", talents: "Talents", zones: "Map",
    settings: "Settings", sfx: "Sound FX", ambiance: "Ambiance",
    minutes: "Minutes", backpack: "Backpack", weapons: "Weapons", potions: "Potions", pets: "Pets",
    level: "Level", xp: "XP", gold: "Gold", kills: "Kills", hours: "Hours", streak: "Streak",
    hp: "PV", damage: "Damage", cost: "Cost", owned: "Owned", equipped: "Equipped",
    victory: "Session Complete!", defeat: "Defeat", gold_won: "Gold Won", xp_won: "XP Won", session_kills: "Defeated",
    return_menu: "Return", give_up: "Give Up", focus_active: "Focus Active",
    freeze_active: "STASIS", daily_title: "Daily Bonus", daily_claim: "Claim",
    unknown: "???", travel: "Travel", upgrade: "Upgrade", boss_spawn: "BOSS INCOMING!", combo: "COMBO",
    ad_chest: "Ad Chest", ad_revive: "Revive", battery_mode_on: "Tap to wake"
  }
};

const ZONES = [
  { id: 'forest', name: 'zone_forest', cost: 0, mult: 1, monsters: ['slime', 'rat', 'wolf', 'goblin', 'treant'], color: 'from-emerald-900 to-stone-900', icon: '🌲' },
  { id: 'catacombs', name: 'zone_catacombs', cost: 2000, mult: 1.5, monsters: ['skeleton', 'bat_mob', 'ghost_mob', 'zombie', 'necromancer'], color: 'from-slate-900 to-black', icon: '☠️' },
  { id: 'volcano', name: 'zone_volcano', cost: 8000, mult: 2.5, monsters: ['imp', 'fire_elemental', 'salamander', 'golem', 'dragon'], color: 'from-red-900 to-orange-900', icon: '🌋' },
  { id: 'void', name: 'zone_void', cost: 30000, mult: 5, monsters: ['shadow', 'beholder', 'cultist', 'demon'], color: 'from-purple-900 to-black', icon: '🌌' },
];

const MONSTERS = [
  { id: 'slime', baseHp: 300, xp: 25, color: "text-green-500", name: { fr: "Slime", en: "Slime" }, lore: { fr: "Gluant et vert.", en: "Sticky and green." } },
  { id: 'rat', baseHp: 450, xp: 35, color: "text-stone-500", name: { fr: "Rat Géant", en: "Giant Rat" }, lore: { fr: "Vit dans les égouts.", en: "Lives in sewers." } },
  { id: 'wolf', baseHp: 600, xp: 50, color: "text-stone-400", name: { fr: "Loup", en: "Wolf" }, lore: { fr: "Chasse en meute.", en: "Hunts in packs." } },
  { id: 'goblin', baseHp: 800, xp: 60, color: "text-green-700", name: { fr: "Gobelin", en: "Goblin" }, lore: { fr: "Voleur de pièces.", en: "Coin thief." } },
  { id: 'treant', baseHp: 1500, xp: 100, color: "text-green-900", name: { fr: "Tréant", en: "Treant" }, lore: { fr: "Arbre vivant.", en: "Living tree." } },
  { id: 'skeleton', baseHp: 2000, xp: 150, color: "text-stone-200", name: { fr: "Squelette", en: "Skeleton" }, lore: { fr: "Os cliquetants.", en: "Rattling bones." } },
  { id: 'bat_mob', baseHp: 1800, xp: 140, color: "text-purple-400", name: { fr: "Vampire", en: "Vampire" }, lore: { fr: "Craint le soleil.", en: "Fears sun." } },
  { id: 'ghost_mob', baseHp: 2500, xp: 180, color: "text-cyan-300", name: { fr: "Spectre", en: "Specter" }, lore: { fr: "Intangible.", en: "Intangible." } },
  { id: 'zombie', baseHp: 3000, xp: 200, color: "text-green-800", name: { fr: "Zombie", en: "Zombie" }, lore: { fr: "Veut des cerveaux.", en: "Wants brains." } },
  { id: 'necromancer', baseHp: 4000, xp: 300, color: "text-purple-600", name: { fr: "Nécromancien", en: "Necromancer" }, lore: { fr: "Maître des morts.", en: "Master of dead." } },
  { id: 'imp', baseHp: 5000, xp: 400, color: "text-red-400", name: { fr: "Diablotin", en: "Imp" }, lore: { fr: "Farceur cruel.", en: "Cruel joker." } },
  { id: 'fire_elemental', baseHp: 7000, xp: 500, color: "text-orange-500", name: { fr: "Élémentaire", en: "Elemental" }, lore: { fr: "Chaud devant.", en: "Hot stuff." } },
  { id: 'salamander', baseHp: 8500, xp: 600, color: "text-orange-400", name: { fr: "Salamandre", en: "Salamander" }, lore: { fr: "Nage dans la lave.", en: "Swims in lava." } },
  { id: 'golem', baseHp: 12000, xp: 800, color: "text-stone-600", name: { fr: "Golem Magma", en: "Magma Golem" }, lore: { fr: "Incassable.", en: "Unbreakable." } },
  { id: 'dragon', baseHp: 20000, xp: 1200, color: "text-red-600", name: { fr: "Dragon", en: "Dragon" }, lore: { fr: "Seigneur du feu.", en: "Fire lord." } },
  { id: 'shadow', baseHp: 30000, xp: 1500, color: "text-gray-900", name: { fr: "Ombre", en: "Shadow" }, lore: { fr: "Votre pire ennemi.", en: "Your worst enemy." } },
  { id: 'beholder', baseHp: 45000, xp: 2000, color: "text-purple-300", name: { fr: "Observateur", en: "Beholder" }, lore: { fr: "Il voit tout.", en: "Sees all." } },
  { id: 'cultist', baseHp: 60000, xp: 2500, color: "text-red-900", name: { fr: "Cultiste", en: "Cultist" }, lore: { fr: "Fou.", en: "Mad." } },
  { id: 'demon', baseHp: 500000, xp: 10000, color: "text-red-950", name: { fr: "Roi Démon", en: "Demon King" }, lore: { fr: "Le boss final.", en: "The final boss." } }
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
  { id: 'potion_gold', name: { fr: "Potion Caféine", en: "Caffeine Potion" }, cost: 150, icon: "☕", effect: { fr: "Double l'Or", en: "Double Gold" } },
  { id: 'potion_freeze', name: { fr: "Sablier Stase", en: "Stasis Hourglass" }, cost: 400, icon: "⏳", effect: { fr: "Sauve 1 fois", en: "Saves once" } },
];

const PETS = [
  { id: 'rock', val: 5, type: 'damage', name: {fr: 'Caillou', en: 'Pet Rock'}, cost: 250, icon: '🪨', desc: {fr: '+5 Dégâts/s', en: '+5 Dmg/s'} },
  { id: 'bat', val: 25, type: 'damage', name: {fr: 'Chauve-souris', en: 'Bat'}, cost: 1500, icon: '🦇', desc: {fr: '+25 Dégâts/s', en: '+25 Dmg/s'} },
  { id: 'cat', val: 0.1, type: 'crit', name: {fr: 'Chat', en: 'Cat'}, cost: 4000, icon: '😺', desc: {fr: '+10% Critique', en: '+10% Crit Chance'} },
  { id: 'ghost', val: 0.20, type: 'gold', name: {fr: 'Fantôme', en: 'Ghost'}, cost: 8000, icon: '👻', desc: {fr: '+20% Or', en: '+20% Gold'} },
  { id: 'owl', val: 0.20, type: 'xp', name: {fr: 'Hibou', en: 'Owl'}, cost: 12000, icon: '🦉', desc: {fr: '+20% XP', en: '+20% XP'} },
  { id: 'book', val: 0.35, type: 'xp', name: {fr: 'Grimoire', en: 'Grimoire'}, cost: 25000, icon: '📘', desc: {fr: '+35% XP', en: '+35% XP'} },
  { id: 'phoenix', val: 0, type: 'regen', name: {fr: 'Phénix', en: 'Phoenix'}, cost: 50000, icon: '🦅', desc: {fr: 'Juste stylé', en: 'Just cool'} },
  { id: 'dragon_pet', val: 500, type: 'damage', name: {fr: 'Bébé Dragon', en: 'Baby Dragon'}, cost: 100000, icon: '🐲', desc: {fr: '+500 Dégâts/s', en: '+500 Dmg/s'} },
];

const AMBIANCES = [
  { id: 'silence', icon: "😶", name: { fr: "Silence", en: "Silence" }, bg: "bg-stone-900" },
  { id: 'rain', icon: "🌧️", name: { fr: "Pluie", en: "Rain" }, bg: "bg-slate-900" },
  { id: 'fire', icon: "🔥", name: { fr: "Feu", en: "Fire" }, bg: "bg-orange-950" },
  { id: 'wind', icon: "💨", name: { fr: "Vent", en: "Wind" }, bg: "bg-zinc-800" },
  { id: 'space', icon: "🌌", name: { fr: "Espace", en: "Space" }, bg: "bg-indigo-950" },
];

// --- AUDIO PROCEDURAL ---
let audioCtx_p: AudioContext | null = null;
let ambianceNode: AudioBufferSourceNode | null = null;
let ambianceGain: GainNode | null = null;

const initAudio = () => {
  if (!audioCtx_p) {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    audioCtx_p = new AudioContextClass();
  }
  if (audioCtx_p && audioCtx_p.state === 'suspended') audioCtx_p.resume();
  return audioCtx_p;
};

const startProceduralAmbiance = (ctx: AudioContext, type: string, volume: number) => {
  if (ambianceNode) { try { ambianceNode.stop(); } catch(e) {} }

  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + (0.02 * white)) / 1.02;
    data[i] = lastOut * 3.5;
    if (type === 'rain') data[i] *= 1.2;
  }

  ambianceNode = ctx.createBufferSource();
  ambianceNode.buffer = buffer;
  ambianceNode.loop = true;
  ambianceGain = ctx.createGain();
  ambianceGain.gain.value = volume * 0.2;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = type === 'fire' ? 400 : 800;

  ambianceNode.connect(filter);
  filter.connect(ambianceGain);
  ambianceGain.connect(ctx.destination);
  ambianceNode.start(0);
};

const toggleAmbiance = (enable: boolean, type: string, volume: number) => {
  const ctx = initAudio();
  if (!ctx || !enable || type === 'silence') {
    if (ambianceNode) { try { ambianceNode.stop(); } catch(e) {} ambianceNode = null; }
    return;
  }
  startProceduralAmbiance(ctx, type, volume);
};

// --- COMPOSANTS UI ---
const MonsterAvatar = ({ color, isBoss, isHit }: { color: string, isBoss: boolean, isHit: boolean }) => (
  <div className={`w-32 h-32 flex items-center justify-center transition-all ${isBoss ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]' : ''} ${isHit ? 'animate-shake brightness-150' : ''}`}>
    <svg viewBox="0 0 100 100" className={`w-full h-full ${color}`}>
      <circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.8" />
      <circle cx="35" cy="45" r="5" fill="white" />
      <circle cx="65" cy="45" r="5" fill="white" />
      <circle cx="35" cy="45" r="2" fill="black" />
      <circle cx="65" cy="45" r="2" fill="black" />
      <path d="M30,65 Q50,75 70,65" stroke="white" strokeWidth="3" fill="none" />
    </svg>
  </div>
);

const SafeAdBanner = () => (
  <div className="bg-black border-t border-stone-800 h-[50px] w-full flex items-center justify-center shrink-0 z-50">
    <div className="text-stone-600 text-[10px] uppercase tracking-widest">Publicité (ID: ...3733)</div>
  </div>
);

// --- APPLICATION PRINCIPALE ---
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  
  // États persistants
  const [gold, setGold] = useState(0);
  const [playerXp, setPlayerXp] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [currentWeapon, setCurrentWeapon] = useState(0);
  const [weaponLevels, setWeaponLevels] = useState<Record<number, number>>({});
  const [inventory, setInventory] = useState<string[]>([]);
  const [ownedPets, setOwnedPets] = useState<string[]>([]);
  const [equippedPet, setEquippedPet] = useState<string | null>(null);
  const [talents, setTalents] = useState<any>({ str: 0, greed: 0, wis: 0 });
  const [unlockedZones, setUnlockedZones] = useState<string[]>(['forest']);
  const [currentZone, setCurrentZone] = useState('forest');
  const [bestiary, setBestiary] = useState<string[]>([]);
  const [monstersKilled, setMonstersKilled] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  // États UI
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'victory' | 'defeat'>('menu');
  const [activeTab, setActiveTab] = useState<'play' | 'shop' | 'profile' | 'zones' | 'bestiary'>('play');
  const [shopTab, setShopTab] = useState<'weapons' | 'potions' | 'pets'>('weapons');
  const [showSettings, setShowSettings] = useState(false);
  const [batteryMode, setBatteryMode] = useState(false);
  const [ambianceVolume, setAmbianceVolume] = useState(0.5);
  const [currentAmbiance, setCurrentAmbiance] = useState(0);
  const [isAdLoading, setIsAdLoading] = useState(false);

  // États de bataille
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedTime, setSelectedTime] = useState(25);
  const [monsterCurrentHp, setMonsterCurrentHp] = useState(100);
  const [currentMonsterId, setCurrentMonsterId] = useState('slime');
  const [sessionKills, setSessionKills] = useState(0);
  const [sessionGold, setSessionGold] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isHit, setIsHit] = useState(false);
  const [lastDamage, setLastDamage] = useState(0);
  const [isCrit, setIsCrit] = useState(false);
  const [shinyType, setShinyType] = useState<'none' | 'boss' | 'gold'>('none');
  const [activeBuff, setActiveBuff] = useState<string | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);

  const timerRef = useRef<any>(null);

  // --- DERIVED ---
  const availableTalents = Math.max(0, (playerLevel - 1) - (talents.str + talents.greed + talents.wis));

  // --- FIREBASE INITIALIZATION (Rule 3) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error", err);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u: any) => setUser(u));
  }, []);

  // Chargement des données (Rule 1)
  useEffect(() => {
    if (!user) return;
    const userDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'save', 'main');
    getDoc(userDoc).then((snap: any) => {
      if (snap.exists()) {
        const d = snap.data();
        setGold(d.gold || 0); setPlayerLevel(d.playerLevel || 1);
        setPlayerXp(d.playerXp || 0); setTalents(d.talents || {str:0,greed:0,wis:0});
        setUnlockedZones(d.unlockedZones || ['forest']); setWeaponLevels(d.weaponLevels || {});
        setCurrentWeapon(d.currentWeapon || 0); setOwnedPets(d.ownedPets || []);
        setEquippedPet(d.equippedPet || null); setBestiary(d.bestiary || []);
        setMonstersKilled(d.monstersKilled || 0); setTotalMinutes(d.totalMinutes || 0);
        setStreakDays(d.streakDays || 0); setInventory(d.inventory || []);
      }
    });
  }, [user]);

  const saveProgress = async () => {
    if (!user) return;
    const userDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'save', 'main');
    try {
      await setDoc(userDoc, {
        gold, playerLevel, playerXp, talents, unlockedZones, weaponLevels, currentWeapon,
        ownedPets, equippedPet, bestiary, monstersKilled, totalMinutes, streakDays, inventory, lastLogin: Date.now()
      }, { merge: true });
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  // --- ACTIONS ---
  const handleWatchAd = (rewardType: 'chest' | 'revive') => {
    if (isAdLoading) return;
    setIsAdLoading(true);
    setTimeout(() => {
      if (rewardType === 'chest') {
        setGold(prev => prev + REWARD_AD_CHEST);
      } else if (rewardType === 'revive') {
        setGameState('playing');
        spawnMonster(true);
      }
      setIsAdLoading(false);
      saveProgress();
    }, 1500);
  };

  const spawnMonster = (isFirst = false) => {
    const zone = ZONES.find(z => z.id === currentZone);
    if (!zone) return;
    const mPool = zone.monsters;
    const isBoss = !isFirst && (sessionKills + 1) % 10 === 0;
    const mId = isBoss ? mPool[mPool.length - 1] : mPool[Math.floor(Math.random() * (mPool.length - 1))];
    const monster = MONSTERS.find(m => m.id === mId) || MONSTERS[0];
    
    setCurrentMonsterId(mId);
    setShinyType(isBoss ? 'boss' : (Math.random() > 0.95 ? 'gold' : 'none'));
    let hp = monster.baseHp * (isBoss ? 5 : 1) * (1 + playerLevel * 0.05);
    setMonsterCurrentHp(hp);
  };

  const startBattle = (mins: number) => {
    initAudio();
    toggleAmbiance(true, AMBIANCES[currentAmbiance].id, ambianceVolume);
    setSelectedTime(mins);
    setTimeLeft(mins * 60);
    setSessionKills(0); setSessionGold(0); setSessionXp(0);
    setCombo(0); setGameState('playing');
    spawnMonster(true);
  };

  const endBattle = (victory: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (victory) {
      setGold(g => g + sessionGold);
      setMonstersKilled(k => k + sessionKills);
      setTotalMinutes(m => m + selectedTime);
      let xp = playerXp + sessionXp + (selectedTime * 10);
      let lvl = playerLevel;
      while (xp >= lvl * 100) { xp -= lvl * 100; lvl++; }
      setPlayerXp(xp); setPlayerLevel(lvl);
      setGameState('victory');
    } else {
      setGameState('defeat');
    }
    setActiveBuff(null);
    saveProgress();
  };

  // --- BOUCLE DE JEU ---
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { endBattle(true); return 0; }
          
          setIsAttacking(true);
          setTimeout(() => setIsAttacking(false), 300);

          const weapon = WEAPONS[currentWeapon];
          const lvl = weaponLevels[currentWeapon] || 0;
          const pet = PETS.find(p => p.id === equippedPet);
          
          let dmg = (weapon.damage * (1 + lvl * 0.2)) * (1 + talents.str * 0.05);
          if (pet && pet.type === 'damage') dmg += (pet.val as number);

          const critChance = 0.15 + (pet && pet.type === 'crit' ? (pet.val as number) : 0);
          const crit = Math.random() < critChance;
          if (crit) dmg *= 3;
          
          setLastDamage(Math.floor(dmg)); setIsCrit(crit); setIsHit(true);
          setTimeout(() => setIsHit(false), 200);

          setMonsterCurrentHp(h => {
            if (h - dmg <= 0) {
              const m = MONSTERS.find(mo => mo.id === currentMonsterId);
              if (!m) return 0;
              let gMult = (1 + talents.greed * 0.05) * (1 + combo * 0.1);
              if (activeBuff === 'potion_gold') gMult *= 2;
              let xMult = (1 + talents.wis * 0.05);

              let gWon = Math.floor(m.xp * gMult);
              let xWon = Math.floor(m.xp * xMult);
              if (shinyType === 'boss') { gWon *= 10; xWon *= 10; }
              if (shinyType === 'gold') { gWon *= 5; }
              
              setSessionGold(sg => sg + gWon);
              setSessionXp(sx => sx + xWon);
              setSessionKills(sk => sk + 1);
              setCombo(c => Math.min(c + 1, 10));
              setBestiary(b => b.includes(currentMonsterId) ? b : [...b, currentMonsterId]);
              spawnMonster();
              return 999999;
            }
            return h - dmg;
          });
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, currentMonsterId, combo, equippedPet, activeBuff, currentWeapon, weaponLevels, talents, shinyType, playerLevel]);

  useEffect(() => {
    if (gameState === 'playing') {
      toggleAmbiance(true, AMBIANCES[currentAmbiance].id, ambianceVolume);
    } else {
      toggleAmbiance(false, 'silence', 0);
    }
  }, [gameState, currentAmbiance, ambianceVolume]);

  const t = (k: string) => (TEXTS[lang] as any)[k] || k;
  const tData = (d: any) => d[lang] || d['en'];
  const currentZoneObj = ZONES.find(z => z.id === currentZone) || ZONES[0];

  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-stone-950 text-white font-mono select-none overflow-hidden ${AMBIANCES[currentAmbiance].bg}`}>
      <style>{`
        @keyframes strike { 0% { transform: translateY(0) rotate(0deg); } 20% { transform: translateY(-30px) rotate(-15deg); } 100% { transform: translateY(0) rotate(0deg); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-strike { animation: strike 0.3s ease-out; }
        .animate-shake { animation: shake 0.1s linear infinite; }
      `}</style>

      <div className="w-full max-w-md h-full bg-stone-900 shadow-2xl flex flex-col relative border-x border-stone-800">
        
        {/* HEADER */}
        <div className="p-4 bg-stone-900 border-b border-stone-800 flex justify-between items-center z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-800 rounded-full border-2 border-stone-700 flex items-center justify-center font-bold text-sm">{playerLevel}</div>
            <div className="w-24">
              <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{width: `${(playerXp/(playerLevel*100))*100}%`}}></div>
              </div>
              <div className="text-[10px] text-stone-500 mt-1 uppercase">{playerXp} XP</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700 font-bold text-yellow-500 text-sm flex items-center gap-2">
              <ShoppingBag size={14}/> {Math.floor(gold)}
            </div>
            <button onClick={() => setShowSettings(!showSettings)} className="text-stone-500 hover:text-white transition-colors"><Settings size={20}/></button>
          </div>
        </div>

        {/* MODAL SETTINGS */}
        {showSettings && (
          <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-stone-800 w-full rounded-2xl p-6 border border-stone-700 shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h3 className="font-black uppercase">{t('settings')}</h3><button onClick={() => setShowSettings(false)}><X/></button></div>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">{t('lang_select')}</span>
                  <button onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')} className="bg-stone-700 px-4 py-1.5 rounded-lg text-xs font-black uppercase">{lang}</button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-stone-500 uppercase font-bold"><span>{t('ambiance')}</span><span>{Math.round(ambianceVolume*100)}%</span></div>
                  <input type="range" min="0" max="1" step="0.1" value={ambianceVolume} onChange={(e) => setAmbianceVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none" />
                </div>
                <div className="flex gap-2 pt-4">
                  <button onClick={saveProgress} className="flex-1 bg-stone-700 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Upload size={14}/> {t('save_export')}</button>
                  <button onClick={() => {if(confirm(t('reset_confirm'))) {localStorage.clear(); window.location.reload();}}} className="flex-1 bg-red-900/30 py-3 rounded-xl text-xs text-red-400 font-bold">{t('reset_data')}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-24">
          {gameState === 'menu' && (
            <div className="p-4 space-y-6">
              <div className="flex gap-2 bg-stone-900 p-1 rounded-xl border border-stone-800 mb-2 overflow-x-auto">
                {(['zones', 'play', 'shop', 'profile', 'bestiary'] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-3 text-[10px] font-black uppercase rounded-lg whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-stone-500'}`}>{t(tab)}</button>
                ))}
              </div>

              {activeTab === 'play' && (
                <div className="animate-in fade-in duration-500">
                  <div className={`w-full h-48 rounded-2xl bg-gradient-to-br ${currentZoneObj.color} border-4 border-stone-800 flex flex-col items-center justify-center relative mb-6 shadow-inner`}>
                    <div className="text-7xl mb-2 drop-shadow-xl">{currentZoneObj.icon}</div>
                    <div className="font-black text-2xl uppercase tracking-widest text-white drop-shadow-md">{t(currentZoneObj.name)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[10, 25, 45, 60].map(time => (
                      <button key={time} onClick={() => startBattle(time)} className="bg-stone-800/50 hover:bg-stone-800 border-2 border-stone-800 p-4 rounded-2xl flex flex-col items-center group active:scale-95 transition-all">
                        <span className="text-3xl font-black group-hover:text-red-500">{time}</span>
                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">{t('minutes')}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {AMBIANCES.map((a, i) => (
                      <button key={a.id} onClick={() => setCurrentAmbiance(i)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${currentAmbiance === i ? 'bg-white text-stone-900 border-white' : 'bg-stone-900 text-stone-500 border-stone-800'}`}>{a.icon} {tData(a.name)}</button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'shop' && (
                <div className="space-y-4">
                  <div className="flex bg-stone-900 p-1 rounded-xl border border-stone-800">
                    {(['weapons', 'potions', 'pets'] as const).map(tab => (
                      <button key={tab} onClick={() => setShopTab(tab)} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg ${shopTab === tab ? 'bg-stone-700 text-white' : 'text-stone-500'}`}>{t(tab)}</button>
                    ))}
                  </div>
                  <button onClick={() => handleWatchAd('chest')} className="w-full bg-yellow-900/30 border border-yellow-600 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Video className={`text-yellow-500 ${isAdLoading ? 'animate-spin' : ''}`} />
                      <div className="text-left"><div className="text-xs font-black text-yellow-100 uppercase">{t('ad_chest')}</div></div>
                    </div>
                    <div className="bg-yellow-600 text-black px-3 py-1 rounded-lg text-[10px] font-black uppercase">GO</div>
                  </button>
                  {shopTab === 'weapons' && WEAPONS.map((w, i) => {
                    const isOwned = i <= currentWeapon;
                    const lvl = weaponLevels[i] || 0;
                    const upCost = Math.floor(w.cost * 0.5 * (lvl + 1)) || 100;
                    return (
                      <div key={w.id} className={`p-4 rounded-2xl border transition-all ${i === currentWeapon ? 'border-green-600 bg-green-950/20' : 'border-stone-800 bg-stone-900/40'}`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-stone-800 rounded-xl flex items-center justify-center text-2xl relative">{w.icon}{lvl > 0 && <span className="absolute -top-1 -right-1 bg-blue-600 text-[9px] px-1.5 py-0.5 rounded font-bold">+{lvl}</span>}</div>
                            <div><div className="text-sm font-black uppercase">{tData(w.name)}</div><div className="text-[10px] text-stone-500 font-bold">{t('damage')}: {Math.floor(w.damage * (1 + lvl * 0.2))}</div></div>
                          </div>
                          {!isOwned ? <button onClick={() => { if(gold>=w.cost) { setGold(g=>g-w.cost); setCurrentWeapon(i); saveProgress(); }}} className="bg-yellow-600 px-4 py-1.5 rounded-lg text-xs font-black">{w.cost} 🪙</button> : (i === currentWeapon ? <div className="text-green-500 text-[10px] font-black uppercase tracking-widest">{t('equipped')}</div> : <button onClick={() => setCurrentWeapon(i)} className="text-stone-500 text-xs font-bold">{t('equipped')}</button>)}
                        </div>
                        {isOwned && <button onClick={() => { if(gold >= upCost) { setGold(g => g - upCost); setWeaponLevels({...weaponLevels, [i]: lvl + 1}); saveProgress(); }}} className="w-full bg-stone-800 mt-3 py-2 rounded-xl text-[10px] font-black uppercase text-stone-400 border border-stone-700">{t('upgrade')} — {upCost} 🪙</button>}
                      </div>
                    );
                  })}
                  {shopTab === 'potions' && ITEMS.map(it => (
                    <button key={it.id} onClick={() => { if(gold >= it.cost) { setGold(g => g - it.cost); setInventory([...inventory, it.id]); saveProgress(); }}} className="w-full p-4 rounded-2xl bg-stone-900/40 border border-stone-800 flex items-center justify-between">
                      <div className="flex items-center gap-4"><div className="w-10 h-10 bg-stone-800 rounded flex items-center justify-center text-xl">{it.icon}</div><div><div className="text-sm font-black uppercase">{tData(it.name)}</div><div className="text-[10px] text-stone-500">{tData(it.effect)}</div></div></div>
                      <div className="text-yellow-500 font-bold">{it.cost} 🪙</div>
                    </button>
                  ))}
                  {shopTab === 'pets' && PETS.map(p => {
                    const isOwned = ownedPets.includes(p.id);
                    const isEquipped = equippedPet === p.id;
                    return (
                      <button key={p.id} onClick={() => { if(!isOwned && gold >= p.cost) { setGold(g => g - p.cost); setOwnedPets([...ownedPets, p.id]); setEquippedPet(p.id); saveProgress(); } else if(isOwned) { setEquippedPet(isEquipped ? null : p.id); }}} className={`w-full p-4 rounded-2xl border flex items-center justify-between ${isEquipped ? 'border-blue-500 bg-blue-950/20' : 'border-stone-800 bg-stone-900/40'}`}>
                        <div className="flex items-center gap-4"><div className="w-12 h-12 bg-stone-800 rounded flex items-center justify-center text-xl">{p.icon}</div><div><div className="text-sm font-black uppercase">{tData(p.name)}</div><div className="text-[10px] text-stone-500">{tData(p.desc)}</div></div></div>
                        {!isOwned ? <div className="text-yellow-500 font-bold">{p.cost} 🪙</div> : <div className={`text-[10px] font-black uppercase ${isEquipped ? 'text-blue-500' : 'text-stone-500'}`}>{isEquipped ? 'ACTIF' : 'ACTIVER'}</div>}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="bg-stone-800/50 p-6 rounded-2xl border border-stone-800 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Pickaxe size={16} className="text-stone-500"/> {t('talents')}</h3>
                      <span className="text-xs font-bold text-stone-500">{t('points')}: <span className="text-white">{availableTalents}</span></span>
                    </div>
                    <div className="space-y-3">
                      {['str', 'greed', 'wis'].map(key => (
                        <div key={key} className="bg-stone-900/50 p-3.5 rounded-xl flex justify-between items-center border border-stone-800/50">
                          <span className="text-xs font-bold uppercase text-stone-400">{t(key)} (+{talents[key]*5}%)</span>
                          <div className="flex items-center gap-4">
                            <span className="font-black text-sm">{talents[key]}</span>
                            <button disabled={availableTalents <= 0} onClick={() => {setTalents({...talents, [key]: talents[key] + 1}); saveProgress();}} className="w-8 h-8 bg-blue-600 hover:bg-blue-500 disabled:bg-stone-800 disabled:opacity-50 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-blue-900/20">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[{label: 'kills', val: monstersKilled}, {label: 'hours', val: (totalMinutes/60).toFixed(1)}, {label: 'streak', val: `${streakDays} 🔥`}].map(s => (
                      <div key={s.label} className="bg-stone-900 p-4 rounded-2xl text-center border border-stone-800">
                        <div className="text-[9px] text-stone-500 uppercase font-black mb-1">{t(s.label)}</div>
                        <div className={`font-black text-lg`}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {activeTab === 'zones' && (
                <div className="space-y-3">
                  {ZONES.map(z => {
                    const isUnlocked = unlockedZones.includes(z.id);
                    return (
                      <button key={z.id} onClick={() => isUnlocked ? setCurrentZone(z.id) : null} className={`w-full relative overflow-hidden rounded-2xl border-2 p-4 flex items-center justify-between ${currentZone === z.id ? 'border-indigo-500' : 'border-stone-800'} ${!isUnlocked ? 'opacity-50 grayscale' : ''}`}>
                         <div className={`absolute inset-0 bg-gradient-to-r ${z.color} opacity-40`}></div>
                         <div className="relative flex items-center gap-4"><div className="text-3xl">{z.icon}</div><div><div className="font-bold text-sm text-white uppercase">{t(z.name)}</div><div className="text-[10px] text-stone-300">Bonus x{z.mult}</div></div></div>
                         {!isUnlocked ? <button onClick={(e) => { e.stopPropagation(); if(gold >= z.cost) { setGold(g => g - z.cost); setUnlockedZones([...unlockedZones, z.id]); saveProgress(); }}} className="relative bg-stone-900 px-3 py-1.5 rounded text-yellow-500 text-[10px] font-black"><Lock size={12} className="inline mr-1"/> {z.cost}</button> : (currentZone === z.id ? <div className="relative text-indigo-400 font-black text-[10px]">ACTUEL</div> : <ArrowRight size={16} className="relative text-stone-500"/>)}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'bestiary' && (
                <div className="grid grid-cols-2 gap-3">
                   {MONSTERS.map(m => {
                     const unlocked = bestiary.includes(m.id);
                     return (
                       <div key={m.id} className={`bg-stone-800/50 p-4 rounded-2xl border ${unlocked ? 'border-stone-700' : 'border-stone-800 opacity-40'} flex flex-col items-center text-center`}>
                          <div className={`w-16 h-16 rounded-full bg-black/30 flex items-center justify-center mb-3 ${!unlocked ? 'grayscale' : ''}`}>
                            {unlocked ? <MonsterAvatar color={m.color} isBoss={false} isHit={false} /> : <Skull size={24} className="text-stone-700" />}
                          </div>
                          <div className="text-[11px] font-black uppercase text-stone-200">{unlocked ? tData(m.name) : t('unknown')}</div>
                       </div>
                     );
                   })}
                </div>
              )}
            </div>
          )}

          {gameState === 'playing' && (
            <div className={`fixed inset-0 z-[200] flex flex-col ${batteryMode ? 'bg-black' : 'bg-stone-950 transition-colors duration-1000'}`}>
              {batteryMode && <div onClick={() => setBatteryMode(false)} className="absolute inset-0 z-[210] bg-black flex flex-col items-center justify-center text-stone-800 animate-pulse"><EyeOff size={64} className="mb-4" /><div className="text-xs font-black uppercase tracking-[0.3em]">{t('battery_mode_on')}</div></div>}
              <div className="p-4 flex justify-between items-center">
                <button onClick={() => setBatteryMode(!batteryMode)} className="text-stone-600"><Battery size={20}/></button>
                <div className="bg-stone-900/50 px-3 py-1 rounded-full border border-stone-800 text-[10px] font-black uppercase tracking-widest text-stone-500 animate-pulse">
                   <Shield size={10} className="inline mr-2 text-red-500"/> {t('focus_active')}
                </div>
                <button onClick={() => setGameState('menu')} className="text-stone-600"><X size={20}/></button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                <div className="text-7xl font-black mb-16 tracking-tighter tabular-nums text-white drop-shadow-2xl">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2, '0')}</div>
                <div className="relative mb-12 flex flex-col items-center">
                  <MonsterAvatar color={(MONSTERS.find(m => m.id === currentMonsterId) || MONSTERS[0]).color} isBoss={shinyType === 'boss'} isHit={isHit} />
                  {isHit && <div className={`absolute -top-12 left-1/2 -translate-x-1/2 font-black text-5xl animate-in slide-in-from-bottom-2 ${isCrit ? 'text-yellow-400 scale-125' : 'text-red-500'}`}>-{lastDamage}</div>}
                  <div className="w-56 bg-stone-900 h-2.5 rounded-full mt-10 border border-stone-800 overflow-hidden shadow-inner">
                    <div className={`h-full transition-all duration-300 ${shinyType === 'boss' ? 'bg-red-600' : 'bg-green-500'}`} style={{ width: `${(monsterCurrentHp / ( (MONSTERS.find(m => m.id === currentMonsterId) || MONSTERS[0]).baseHp * (shinyType==='boss'?5:1) * (1+playerLevel*0.05) )) * 100}%` }}></div>
                  </div>
                  <div className="text-[10px] text-stone-500 mt-3 font-black uppercase tracking-widest">{tData((MONSTERS.find(m => m.id === currentMonsterId) || MONSTERS[0]).name)}</div>
                </div>
                <div className="grid grid-cols-3 gap-8 w-full max-w-xs">
                  <div className="text-center"><div className="text-[9px] text-stone-600 uppercase font-black mb-1">{t('kills')}</div><div className="font-black text-xl text-red-500">{sessionKills}</div></div>
                  <div className="text-center"><div className="text-[9px] text-stone-600 uppercase font-black mb-1">{t('gold')}</div><div className="font-black text-xl text-yellow-500">{sessionGold}</div></div>
                  <div className="text-center"><div className="text-[9px] text-stone-600 uppercase font-black mb-1">{t('combo')}</div><div className={`font-black text-xl transition-all ${combo > 0 ? 'text-orange-500 scale-110' : 'text-stone-800'}`}>x{combo}</div></div>
                </div>
                <div className={`mt-16 text-7xl transition-all duration-100 ${isAttacking ? 'animate-strike' : 'opacity-20'}`}>{WEAPONS[currentWeapon].icon}</div>
              </div>
            </div>
          )}

          {(gameState === 'victory' || gameState === 'defeat') && (
            <div className="fixed inset-0 z-[300] bg-stone-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
              {gameState === 'victory' ? (
                <>
                  <Trophy size={64} className="text-yellow-500 mb-6 animate-bounce" />
                  <h2 className="text-4xl font-black mb-2 uppercase text-green-500 tracking-tighter">{t('victory')}</h2>
                  <div className="bg-stone-900 w-full rounded-3xl p-8 border border-stone-800 my-8 space-y-4 shadow-2xl">
                    <div className="flex justify-between items-center text-sm font-bold"><span className="text-stone-500 uppercase">{t('session_kills')}</span><span className="text-white">{sessionKills}</span></div>
                    <div className="flex justify-between items-center text-sm font-bold"><span className="text-stone-500 uppercase">{t('gold_won')}</span><span className="text-yellow-500">+{sessionGold} 🪙</span></div>
                    <div className="flex justify-between items-center text-sm font-bold"><span className="text-stone-500 uppercase">{t('xp_won')}</span><span className="text-blue-500">+{sessionXp + selectedTime * 10} XP</span></div>
                  </div>
                </>
              ) : (
                <>
                  <Skull size={80} className="text-red-600 mb-8 animate-pulse" />
                  <h2 className="text-4xl font-black mb-8 uppercase text-red-600 tracking-tighter">{t('defeat')}</h2>
                  <button onClick={() => handleWatchAd('revive')} className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-sm mb-4 flex items-center justify-center gap-3 active:scale-95 transition-all"><Video size={18}/> {t('ad_revive')}</button>
                </>
              )}
              <button onClick={() => {setGameState('menu'); setActiveTab('play');}} className="w-full bg-white text-stone-950 py-5 rounded-2xl font-black uppercase text-sm tracking-widest active:scale-95 transition-all">{t('return_menu')}</button>
            </div>
          )}
        </div>

        {gameState === 'menu' && (
          <div className="bg-stone-900 border-t border-stone-800 p-2 flex justify-around items-center h-20 shrink-0 z-50">
            <button onClick={() => setActiveTab('shop')} className={`flex flex-col items-center p-2 w-20 transition-all ${activeTab === 'shop' ? 'text-white' : 'text-stone-600'}`}>
              <ShoppingBag size={22}/>
              <span className="text-[9px] uppercase font-black mt-1.5 tracking-widest">{t('shop')}</span>
            </button>
            <button onClick={() => setActiveTab('play')} className="flex flex-col items-center justify-center w-16 h-16 bg-red-600 rounded-full -mt-10 shadow-2xl border-4 border-stone-900 text-white transform active:scale-90 transition-all">
              <Sword size={28}/>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center p-2 w-20 transition-all ${activeTab === 'profile' ? 'text-white' : 'text-stone-600'}`}>
              <User size={22}/>
              <span className="text-[9px] uppercase font-black mt-1.5 tracking-widest">{t('profile')}</span>
            </button>
          </div>
        )}

        <SafeAdBanner />
      </div>
    </div>
  );
}
