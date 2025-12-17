import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sword, Skull, Zap, Trophy, Shield, ShoppingBag, Music, User, 
  Calendar, Lock, BookOpen, Settings, Volume2, Flame, Globe, 
  Hammer, ArrowRight, Pickaxe, Video, Battery, EyeOff, X, 
  Upload, Download, Info
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from 'firebase/firestore';

// --- CONFIGURATION & CONSTANTES ---
const REWARD_DAILY = 50;
const REWARD_AD_CHEST = 350;

const appId = typeof __app_id !== 'undefined' ? __app_id : 'focus-fighter-rpg';
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "", projectId: "focus-fighter-rpg", authDomain: "focus-fighter-rpg.firebaseapp.com" };

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- AUDIO ENGINE ---
const AMBIANCE_SOUNDS = {
  rain: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_733626245e.mp3', // Example rain
  fire: '', 
  wind: '',
  river: '',
  space: '',
};

let audioCtx = null;
let ambianceNode = null;
let ambianceGain = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

// --- DATA ---
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
    save_export: "Exporter", save_import: "Importer",
    save_copied: "Copié !", save_error: "Erreur", save_loaded: "Chargé !",
    reset_data: "Réinitialiser", reset_confirm: "Tout sera perdu. Confirmer ?", lang_select: "Langue",
    str: "Force", greed: "Avarice", wis: "Sagesse", points: "Points",
    ad_chest: "Coffre Pub", ad_chest_desc: `Vidéo pour ${REWARD_AD_CHEST} 🪙`,
    ad_revive: "Ressusciter", ad_error: "Erreur Pub",
    youtube_suggest: "Astuce: Lofi en fond !",
    unknown: "Inconnu", unlock: "???", session_kills: "Kills Session", combo: "Combo",
    talents: "Talents", travel: "Voyager", battery_mode_on: "Économie : Touchez pour quitter",
    upgrade: "Améliorer", notify_save: "Progrès sauvegardé"
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
    save_export: "Export", save_import: "Import",
    save_copied: "Copied!", save_error: "Error", save_loaded: "Loaded!",
    reset_data: "Reset Data", reset_confirm: "Are you sure? All lost.", lang_select: "Language",
    str: "Strength", greed: "Greed", wis: "Wisdom", points: "Points",
    ad_chest: "Ad Chest", ad_chest_desc: `Watch for ${REWARD_AD_CHEST} 🪙`,
    ad_revive: "Revive", ad_error: "Ad Error",
    youtube_suggest: "Tip: Play Lofi music!",
    unknown: "Unknown", unlock: "???", session_kills: "Session Kills", combo: "Combo",
    talents: "Talents", travel: "Travel", battery_mode_on: "Battery Mode: Tap to exit",
    upgrade: "Upgrade", notify_save: "Progress saved"
  }
};

const ZONES = [
  { id: 'forest', cost: 0, mult: 1, monsters: ['slime', 'rat', 'wolf', 'goblin', 'treant'], color: 'from-emerald-900 to-stone-900', icon: '🌲' },
  { id: 'catacombs', cost: 2000, mult: 1.5, monsters: ['skeleton', 'bat_mob', 'ghost_mob', 'zombie', 'necromancer'], color: 'from-slate-900 to-black', icon: '☠️' },
  { id: 'volcano', cost: 8000, mult: 2.5, monsters: ['imp', 'fire_elemental', 'salamander', 'golem', 'dragon'], color: 'from-red-900 to-orange-900', icon: '🌋' },
  { id: 'void', cost: 30000, mult: 5, monsters: ['shadow', 'beholder', 'cultist', 'demon'], color: 'from-purple-900 to-black', icon: '🌌' },
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
    { id: 'demon', baseHp: 250000, xp: 10000, color: "text-red-950", name: { fr: "Roi Démon", en: "Demon King" }, lore: { fr: "Le boss final.", en: "The final boss." } }
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

// --- COMPONENTS HELPER ---
const MonsterAvatar = ({ id, color, isBoss, sizeClass = "w-40 h-40" }) => {
  const glow = isBoss ? 'drop-shadow(0 0 15px red)' : '';
  return (
    <div className={`flex items-center justify-center transition-all duration-300 ${isBoss ? 'scale-125' : ''} ${sizeClass}`} style={{ filter: glow }}>
      <svg viewBox="0 0 100 100" className={`w-full h-full ${color}`}>
        {id.includes('slime') ? (
          <path d="M20,80 Q10,80 10,70 Q10,40 50,40 Q90,40 90,70 Q90,80 80,80 Z" fill="currentColor" />
        ) : (
          <circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.9" />
        )}
        <circle cx="35" cy="45" r="5" fill="white" />
        <circle cx="65" cy="45" r="5" fill="white" />
        <circle cx="35" cy="45" r="2" fill="black" />
        <circle cx="65" cy="45" r="2" fill="black" />
      </svg>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('fr');
  
  // Game State
  const [gold, setGold] = useState(0);
  const [playerXp, setPlayerXp] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [currentWeapon, setCurrentWeapon] = useState(0);
  const [weaponLevels, setWeaponLevels] = useState({});
  const [ownedPets, setOwnedPets] = useState([]);
  const [equippedPet, setEquippedPet] = useState(null);
  const [talents, setTalents] = useState({ str: 0, greed: 0, wis: 0 });
  const [unlockedZones, setUnlockedZones] = useState(['forest']);
  const [currentZone, setCurrentZone] = useState('forest');
  const [bestiary, setBestiary] = useState([]);
  const [streakDays, setStreakDays] = useState(0);
  const [monstersKilled, setMonstersKilled] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  
  // UI State
  const [gameState, setGameState] = useState('menu');
  const [activeTab, setActiveTab] = useState('play');
  const [shopTab, setShopTab] = useState('weapons');
  const [showSettings, setShowSettings] = useState(false);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [batteryMode, setBatteryMode] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [ambianceVolume, setAmbianceVolume] = useState(0.5);
  const [currentAmbiance, setCurrentAmbiance] = useState(0);
  const [notification, setNotification] = useState("");

  // Battle State
  const [selectedTime, setSelectedTime] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionKills, setSessionKills] = useState(0);
  const [sessionGold, setSessionGold] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [currentMonsterId, setCurrentMonsterId] = useState('slime');
  const [monsterCurrentHp, setMonsterCurrentHp] = useState(100);
  const [isHit, setIsHit] = useState(false);
  const [lastDamage, setLastDamage] = useState(0);
  const [isCrit, setIsCrit] = useState(false);
  const [shinyType, setShinyType] = useState('none');
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);

  const timerRef = useRef(null);
  const comboRef = useRef(null);

  // --- FIREBASE AUTH & PERSISTENCE ---
  useEffect(() => {
    const init = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error(err); }
    };
    init();
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const userDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'save', 'main');
    
    // Load data
    getDoc(userDoc).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setGold(data.gold || 0);
        setPlayerLevel(data.playerLevel || 1);
        setPlayerXp(data.playerXp || 0);
        setTalents(data.talents || { str: 0, greed: 0, wis: 0 });
        setUnlockedZones(data.unlockedZones || ['forest']);
        setWeaponLevels(data.weaponLevels || {});
        setCurrentWeapon(data.currentWeapon || 0);
        setOwnedPets(data.ownedPets || []);
        setEquippedPet(data.equippedPet || null);
        setBestiary(data.bestiary || []);
        setStreakDays(data.streakDays || 0);
        setMonstersKilled(data.monstersKilled || 0);
        setTotalMinutes(data.totalMinutes || 0);
      }
    });

    // Save interval
    const interval = setInterval(() => {
      saveProgress();
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const saveProgress = async () => {
    if (!user) return;
    const userDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'save', 'main');
    await setDoc(userDoc, {
      gold, playerLevel, playerXp, talents, unlockedZones, weaponLevels, currentWeapon,
      ownedPets, equippedPet, bestiary, streakDays, monstersKilled, totalMinutes,
      lastSave: Date.now()
    }, { merge: true });
  };

  // --- HELPERS ---
  const t = (key) => TEXTS[lang][key] || key;
  const tData = (obj) => obj[lang] || obj['en'];

  const triggerSfx = (type) => {
    if (!sfxEnabled) return;
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === 'attack') { osc.frequency.setValueAtTime(120, now); osc.frequency.exponentialRampToValueAtTime(40, now+0.1); g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.01, now+0.1); osc.start(); osc.stop(now+0.1); }
    if (type === 'crit') { osc.type = 'square'; osc.frequency.setValueAtTime(300, now); g.gain.setValueAtTime(0.1, now); osc.start(); osc.stop(now+0.1); }
  };

  const getDmg = () => {
    const base = WEAPONS[currentWeapon].damage;
    const lvl = weaponLevels[currentWeapon] || 0;
    const petBonus = (equippedPet === 'rock') ? 5 : (equippedPet === 'bat' ? 25 : 0);
    return Math.floor((base * (1 + lvl * 0.2) + petBonus) * (1 + talents.str * 0.05));
  };

  // --- GAME LOGIC ---
  const spawnMonster = () => {
    const zone = ZONES.find(z => z.id === currentZone);
    const mPool = zone.monsters;
    const randomM = mPool[Math.floor(Math.random() * (mPool.length - 1))]; // Non-boss by default
    
    let isBoss = (sessionKills + 1) % 10 === 0;
    const mId = isBoss ? mPool[mPool.length - 1] : randomM;
    const monster = MONSTERS.find(m => m.id === mId);
    
    setCurrentMonsterId(mId);
    setMonsterCurrentHp(monster.baseHp * (isBoss ? 5 : 1) * (1 + playerLevel * 0.05));
    setShinyType(isBoss ? 'boss' : (Math.random() > 0.9 ? 'gold' : 'none'));
  };

  const handleKill = () => {
    const monster = MONSTERS.find(m => m.id === currentMonsterId);
    let g = Math.floor(monster.xp * (1 + talents.greed * 0.05) * (1 + combo * 0.1));
    let x = Math.floor(monster.xp * (1 + talents.wis * 0.05));
    
    if (shinyType === 'boss') { g *= 10; x *= 10; }
    if (shinyType === 'gold') { g *= 5; }

    setSessionGold(s => s + g);
    setSessionXp(s => s + x);
    setSessionKills(s => s + 1);
    setCombo(c => Math.min(c + 1, 10));
    setComboTimer(50);
    
    if (!bestiary.includes(currentMonsterId)) setBestiary(b => [...b, currentMonsterId]);
    spawnMonster();
  };

  const startBattle = (mins) => {
    initAudio();
    setSelectedTime(mins);
    setTimeLeft(mins * 60);
    setGameState('playing');
    setSessionKills(0);
    setSessionGold(0);
    setSessionXp(0);
    setCombo(0);
    spawnMonster();
  };

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { finishBattle(true); return 0; }
          
          // Attack cycle
          const dmg = getDmg();
          const crit = Math.random() < (0.15 + talents.wis * 0.01);
          const totalDmg = crit ? dmg * 3 : dmg;
          
          setLastDamage(totalDmg);
          setIsCrit(crit);
          setIsHit(true);
          setTimeout(() => setIsHit(false), 200);
          triggerSfx(crit ? 'crit' : 'attack');

          setMonsterCurrentHp(hp => {
            if (hp - totalDmg <= 0) {
              handleKill();
              return 1000000; // Reset logic in spawn
            }
            return hp - totalDmg;
          });

          return t - 1;
        });
      }, 1000);

      comboRef.current = setInterval(() => {
        setComboTimer(ct => {
          if (ct <= 0) { setCombo(0); return 0; }
          return ct - 1;
        });
      }, 100);
    }
    return () => {
      clearInterval(timerRef.current);
      clearInterval(comboRef.current);
    };
  }, [gameState, currentMonsterId, currentWeapon, talents]);

  const finishBattle = (success) => {
    setGameState(success ? 'victory' : 'defeat');
    if (success) {
      setGold(g => g + sessionGold);
      setMonstersKilled(m => m + sessionKills);
      setTotalMinutes(m => m + selectedTime);
      const totalXp = sessionXp + selectedTime * 10;
      let newXp = playerXp + totalXp;
      let newLvl = playerLevel;
      while (newXp >= newLvl * 100) {
        newXp -= newLvl * 100;
        newLvl++;
      }
      setPlayerXp(newXp);
      setPlayerLevel(newLvl);
    }
    saveProgress();
  };

  const buyWeapon = (idx) => {
    const w = WEAPONS[idx];
    if (gold >= w.cost) {
      setGold(g => g - w.cost);
      setCurrentWeapon(idx);
    }
  };

  const upgradeWeapon = (idx) => {
    const lvl = weaponLevels[idx] || 0;
    const cost = Math.floor(WEAPONS[idx].cost * 0.5 * (lvl + 1)) || 100;
    if (gold >= cost) {
      setGold(g => g - cost);
      setWeaponLevels(prev => ({ ...prev, [idx]: lvl + 1 }));
    }
  };

  // --- RENDER ---
  const currentMonster = MONSTERS.find(m => m.id === currentMonsterId);
  const xpRequired = playerLevel * 100;
  const availTalents = (playerLevel - 1) - (talents.str + talents.greed + talents.wis);

  return (
    <div className={`fixed inset-0 bg-stone-950 text-white font-mono flex flex-col select-none overflow-hidden ${AMBIANCES[currentAmbiance].bg}`}>
      
      {/* HEADER */}
      <div className="bg-stone-900/80 p-3 border-b border-stone-800 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center font-bold text-xs border border-stone-500">
            {playerLevel}
          </div>
          <div className="w-24">
            <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${(playerXp / xpRequired) * 100}%` }}></div>
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">{playerXp}/{xpRequired} XP</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-stone-800 px-2 py-1 rounded-lg border border-stone-700 text-xs font-bold text-yellow-500 flex items-center gap-1">
            <ShoppingBag size={12}/> {Math.floor(gold)}
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="text-stone-400"><Settings size={18}/></button>
        </div>
      </div>

      {/* MODALS */}
      {showSettings && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm p-6 flex items-center justify-center">
          <div className="bg-stone-800 border border-stone-700 w-full max-w-xs rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold">{t('settings')}</h3>
              <button onClick={() => setShowSettings(false)}><X/></button>
            </div>
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <span className="text-sm">{t('lang_select')}</span>
                 <button onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')} className="bg-stone-700 px-3 py-1 rounded text-xs uppercase font-bold">{lang}</button>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm">{t('sfx')}</span>
                 <button onClick={() => setSfxEnabled(!sfxEnabled)} className={`w-10 h-5 rounded-full relative transition-colors ${sfxEnabled ? 'bg-green-600' : 'bg-stone-600'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${sfxEnabled ? 'left-6' : 'left-1'}`}></div>
                 </button>
               </div>
               <div className="pt-4 border-t border-stone-700 flex gap-2">
                 <button onClick={saveProgress} className="flex-1 bg-stone-700 py-2 rounded text-xs flex items-center justify-center gap-2"><Upload size={12}/> {t('save_export')}</button>
                 <button onClick={() => { if(confirm(t('reset_confirm'))) { localStorage.clear(); window.location.reload(); }}} className="flex-1 bg-red-900/30 py-2 rounded text-xs text-red-500">{t('reset_data')}</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto pb-24 relative">
        {gameState === 'menu' && (
          <div className="p-4">
            {activeTab === 'play' && (
              <div className="flex flex-col items-center gap-6 mt-4">
                <div className="w-full h-40 bg-black/40 rounded-2xl border-2 border-stone-800 flex flex-col items-center justify-center relative overflow-hidden">
                  <span className="text-6xl mb-2">{ZONES.find(z => z.id === currentZone).icon}</span>
                  <span className="text-lg font-bold uppercase tracking-widest">{tData(MONSTERS.find(m => m.id === ZONES.find(z => z.id === currentZone).monsters[0]).name)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  {[10, 25, 45, 60].map(m => (
                    <button key={m} onClick={() => startBattle(m)} className="bg-stone-800/50 hover:bg-stone-800 p-4 rounded-xl border border-stone-700 flex flex-col items-center transition">
                      <span className="text-2xl font-black">{m}</span>
                      <span className="text-[10px] text-stone-500 uppercase">{t('minutes')}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
                  {AMBIANCES.map((a, i) => (
                    <button key={a.id} onClick={() => setCurrentAmbiance(i)} className={`px-4 py-2 rounded-full text-xs whitespace-nowrap border transition ${currentAmbiance === i ? 'bg-stone-100 text-stone-900 border-white' : 'bg-stone-900 text-stone-500 border-stone-800'}`}>
                      {a.icon} {tData(a.name)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'shop' && (
              <div className="space-y-4">
                <div className="flex bg-stone-900 p-1 rounded-xl">
                  {['weapons', 'pets'].map(tab => (
                    <button key={tab} onClick={() => setShopTab(tab)} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg ${shopTab === tab ? 'bg-stone-700 text-white' : 'text-stone-500'}`}>{t(tab)}</button>
                  ))}
                </div>
                
                {shopTab === 'weapons' && WEAPONS.map((w, i) => {
                  const isOwned = i <= currentWeapon;
                  const isEquipped = i === currentWeapon;
                  const lvl = weaponLevels[i] || 0;
                  const upCost = Math.floor(w.cost * 0.5 * (lvl + 1)) || 100;
                  return (
                    <div key={w.id} className={`p-4 rounded-xl border transition ${isEquipped ? 'border-green-500 bg-green-950/20' : 'border-stone-800 bg-stone-900/40'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-stone-800 rounded-lg flex items-center justify-center text-xl relative">
                            {w.icon}
                            {lvl > 0 && <span className="absolute -top-1 -right-1 bg-blue-600 text-[8px] px-1 rounded">+{lvl}</span>}
                          </div>
                          <div>
                            <div className="text-sm font-bold">{tData(w.name)}</div>
                            <div className="text-[10px] text-stone-500">{t('damage')}: {Math.floor(w.damage * (1 + lvl * 0.2))}</div>
                          </div>
                        </div>
                        {!isOwned ? (
                          <button onClick={() => buyWeapon(i)} className="bg-yellow-600 px-3 py-1 rounded text-xs font-bold">{w.cost} 🪙</button>
                        ) : (
                          isEquipped ? <div className="text-green-500 text-[10px] font-bold">ÉQUIPÉ</div> : <button onClick={() => setCurrentWeapon(i)} className="text-stone-400 text-xs">{t('equipped')}</button>
                        )}
                      </div>
                      {isOwned && (
                        <button onClick={() => upgradeWeapon(i)} className="w-full bg-stone-800 py-2 rounded text-[10px] uppercase font-bold text-stone-400 border border-stone-700 hover:text-white">
                          {t('upgrade')} (+20%) — <span className="text-yellow-500">{upCost} 🪙</span>
                        </button>
                      )}
                    </div>
                  );
                })}

                {shopTab === 'pets' && PETS.map(p => {
                  const isOwned = ownedPets.includes(p.id);
                  const isEquipped = equippedPet === p.id;
                  return (
                    <div key={p.id} className={`p-4 rounded-xl border flex items-center justify-between ${isEquipped ? 'border-blue-500 bg-blue-950/20' : 'border-stone-800 bg-stone-900/40'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-800 rounded-lg flex items-center justify-center text-xl">{p.icon}</div>
                        <div>
                          <div className="text-sm font-bold">{tData(p.name)}</div>
                          <div className="text-[10px] text-stone-500">{tData(p.desc)}</div>
                        </div>
                      </div>
                      {!isOwned ? (
                        <button onClick={() => { if(gold >= p.cost) { setGold(g => g - p.cost); setOwnedPets([...ownedPets, p.id]); } }} className="bg-stone-700 px-3 py-1 rounded text-xs">{p.cost} 🪙</button>
                      ) : (
                        <button onClick={() => setEquippedPet(isEquipped ? null : p.id)} className={`px-3 py-1 rounded text-xs ${isEquipped ? 'bg-blue-600' : 'bg-stone-800 text-stone-400'}`}>{isEquipped ? 'ACTIF' : 'ACTIVER'}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold flex items-center gap-2"><Pickaxe size={14}/> {t('talents')}</h3>
                    <span className="text-xs text-stone-500">{t('points')}: <span className="text-white font-bold">{availTalents}</span></span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {['str', 'greed', 'wis'].map(key => (
                      <div key={key} className="bg-stone-800 p-3 rounded-xl flex justify-between items-center">
                        <span className="text-xs uppercase text-stone-400">{t(key)} (+{(talents[key] * 5)}%)</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{talents[key]}</span>
                          <button disabled={availTalents <= 0} onClick={() => setTalents({...talents, [key]: talents[key] + 1})} className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center disabled:bg-stone-700 disabled:opacity-50">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-stone-900 p-3 rounded-xl text-center border border-stone-800">
                    <div className="text-[10px] text-stone-500 uppercase">{t('kills')}</div>
                    <div className="font-bold">{monstersKilled}</div>
                  </div>
                  <div className="bg-stone-900 p-3 rounded-xl text-center border border-stone-800">
                    <div className="text-[10px] text-stone-500 uppercase">{t('hours')}</div>
                    <div className="font-bold">{(totalMinutes / 60).toFixed(1)}</div>
                  </div>
                  <div className="bg-stone-900 p-3 rounded-xl text-center border border-stone-800">
                    <div className="text-[10px] text-stone-500 uppercase">{t('streak')}</div>
                    <div className="font-bold text-orange-500">{streakDays} 🔥</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- PLAYING VIEW --- */}
        {gameState === 'playing' && (
          <div className={`fixed inset-0 z-[100] flex flex-col ${batteryMode ? 'bg-black' : 'bg-stone-950'}`}>
            {batteryMode && (
              <div onClick={() => setBatteryMode(false)} className="absolute inset-0 z-[110] bg-black flex flex-col items-center justify-center text-stone-700 gap-4">
                <EyeOff size={48} className="animate-pulse" />
                <div className="text-xs text-center px-6">{t('battery_mode_on')}</div>
              </div>
            )}
            
            <button onClick={() => setGameState('menu')} className="absolute top-4 right-4 z-[120] text-stone-500"><X size={24}/></button>
            <button onClick={() => setBatteryMode(!batteryMode)} className="absolute top-4 left-4 z-[120] text-stone-500"><Battery size={20}/></button>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
              <div className="text-6xl font-black mb-12 tracking-tighter tabular-nums">
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>

              <div className="relative mb-8 flex flex-col items-center">
                <MonsterAvatar 
                  id={currentMonsterId} 
                  color={currentMonster.color} 
                  isBoss={shinyType === 'boss'} 
                />
                {isHit && (
                  <div className={`absolute -top-10 left-1/2 -translate-x-1/2 font-black text-4xl animate-bounce pointer-events-none ${isCrit ? 'text-yellow-400 scale-150' : 'text-red-500'}`}>
                    -{lastDamage}
                  </div>
                )}
                <div className="w-48 bg-stone-900 h-2 rounded-full mt-6 border border-stone-800 overflow-hidden">
                  <div 
                    className="h-full bg-red-600 transition-all duration-300" 
                    style={{ width: `${(monsterCurrentHp / (currentMonster.baseHp * (shinyType === 'boss' ? 5 : 1) * (1 + playerLevel * 0.05))) * 100}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-stone-500 mt-2 font-bold uppercase tracking-widest">{tData(currentMonster.name)}</div>
              </div>

              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-[10px] text-stone-500 uppercase">{t('kills')}</div>
                  <div className="font-bold text-red-500">{sessionKills}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-stone-500 uppercase">{t('gold')}</div>
                  <div className="font-bold text-yellow-500">{sessionGold}</div>
                </div>
                {combo > 1 && (
                  <div className="text-center">
                    <div className="text-[10px] text-stone-500 uppercase">{t('combo')}</div>
                    <div className="font-bold text-orange-500">x{combo}</div>
                  </div>
                )}
              </div>

              <div className="mt-12 text-6xl opacity-20 pointer-events-none">
                {WEAPONS[currentWeapon].icon}
              </div>
              <div className="absolute bottom-12 text-[10px] text-stone-600 uppercase tracking-widest flex items-center gap-2 animate-pulse">
                <Flame size={12}/> {t('focus_active')}
              </div>
            </div>
          </div>
        )}

        {/* --- RESULT VIEW --- */}
        {(gameState === 'victory' || gameState === 'defeat') && (
          <div className="fixed inset-0 z-[200] bg-stone-950 flex flex-col items-center justify-center p-8 text-center">
            {gameState === 'victory' ? (
              <>
                <Trophy size={64} className="text-yellow-500 mb-4 animate-bounce" />
                <h2 className="text-3xl font-black mb-2 uppercase text-green-500">{t('victory')}</h2>
                <div className="bg-stone-900 w-full rounded-2xl p-6 border border-stone-800 my-6 space-y-3">
                  <div className="flex justify-between text-sm text-stone-400"><span>Kills</span><span className="text-white font-bold">{sessionKills}</span></div>
                  <div className="flex justify-between text-sm text-stone-400"><span>Gold</span><span className="text-yellow-500 font-bold">+{sessionGold}</span></div>
                  <div className="flex justify-between text-sm text-stone-400"><span>XP</span><span className="text-blue-400 font-bold">+{sessionXp + selectedTime * 10}</span></div>
                </div>
              </>
            ) : (
              <>
                <Skull size={64} className="text-red-600 mb-4 animate-pulse" />
                <h2 className="text-3xl font-black mb-8 uppercase text-red-600">{t('defeat')}</h2>
              </>
            )}
            <button onClick={() => setGameState('menu')} className="w-full bg-stone-100 text-stone-950 py-4 rounded-2xl font-black uppercase text-sm">{t('return_menu')}</button>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      {gameState === 'menu' && (
        <div className="bg-stone-900 border-t border-stone-800 p-2 flex justify-around items-center h-20 shrink-0 w-full fixed bottom-0 left-0 right-0 z-50">
          <button onClick={() => setActiveTab('shop')} className={`flex flex-col items-center p-2 w-16 ${activeTab === 'shop' ? 'text-white' : 'text-stone-600'}`}>
            <ShoppingBag size={20}/>
            <span className="text-[9px] uppercase font-bold mt-1">{t('shop')}</span>
          </button>
          <button onClick={() => setActiveTab('play')} className="flex flex-col items-center justify-center w-14 h-14 bg-red-600 rounded-full -mt-8 shadow-xl border-4 border-stone-950 text-white transform active:scale-95 transition">
            <Sword size={24}/>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center p-2 w-16 ${activeTab === 'profile' ? 'text-white' : 'text-stone-600'}`}>
            <User size={20}/>
            <span className="text-[9px] uppercase font-bold mt-1">{t('profile')}</span>
          </button>
        </div>
      )}

      {/* NOTIFICATION */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-4 py-2 rounded-full border border-stone-700 shadow-xl z-[300] animate-bounce">
          {notification}
        </div>
      )}

    </div>
  );
}
