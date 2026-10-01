// Ceres Wiki - generator for the v2 tables (devices, interrupts, profiles, memory).
//
//   node tools/gen/gen-tables.mjs
//
// The data lives here, taken from CeresASM plan/v2 SPEC (sections 2, 3.2, 4, 5.4, 5.5, 5.6,
// 6.4) and pinned to the commit in tools/versions.json. It writes small MDX fragments under
// content/<locale>/_gen/ so the pages include them with <Include>. Keeping the numbers in one
// place is what the plan (section 5.1) asks for: regenerate instead of hand-editing.
//
// This script has no dependencies. Run it after the SPEC moves and commit the fragments.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const MEMORY = [
  ['`0x00000000`–`0x7FFFFFFF`', 'up to 2 GiB', 'RAM', '`OutOfRam`'],
  ['`0x80000000`–`0x9FFFFFFF`', '512 MiB', 'empty', '`Unmapped`'],
  ['`0xA0000000`–`0xDFFFFFFF`', 'up to 1 GiB', 'VRAM', '`OutOfVram`'],
  ['`0xE0000000`–`0xFEFFFFFF`', '496 MiB', 'empty', '`Unmapped`'],
  ['`0xFF000000`–`0xFFFFFFFF`', '16 MiB', 'MMIO (256 slots of 64 KiB)', 'see the slots']
];

const SLOTS = [
  ['`0x00`', '`0xFF000000`', 'Virtual terminal', '19'],
  ['`0x01`', '`0xFF010000`', 'Timer', '16, 17'],
  ['`0x02`', '`0xFF020000`', 'DMA', '18'],
  ['`0x03`', '`0xFF030000`', 'Debug log', '—'],
  ['`0x10`', '`0xFF100000`', 'Keyboard', '20'],
  ['`0x11`', '`0xFF110000`', 'Mouse', '21'],
  ['`0x12`', '`0xFF120000`', 'Gamepad', '22'],
  ['`0x20–0x23`', '`0xFF200000`', 'Audio (control, voices, sequencer, streams)', '28–30'],
  ['`0x30`', '`0xFF300000`', 'Disk', '24'],
  ['`0x31`', '`0xFF310000`', 'HostFs', '25'],
  ['`0x32`', '`0xFF320000`', 'Peripheral ports', '26'],
  ['`0x40–0x43`', '`0xFF400000`', 'GPU (core/screen, commands, 2D, 3D)', '32–35'],
  ['`0xFF`', '`0xFFFF0000`', 'System control', '—']
];

const EXCEPTIONS = [
  ['1', 'Trap'], ['2', 'IllegalInstruction'], ['3', 'MemoryFault'],
  ['4', 'DivisionByZero'], ['5', 'StackOverflow'], ['6', 'AlignmentFault'],
  ['7', 'PageFault'], ['15', 'Syscall']
];

const INTERRUPTS = [
  ['16', 'Timer: countdown'], ['17', 'Timer: alarm'], ['18', 'DMA done'],
  ['19', 'Terminal: input / Ctrl+C'], ['20', 'Keyboard'], ['21', 'Mouse'],
  ['22', 'Gamepad'], ['24', 'Disk'], ['25', 'HostFs'], ['26', 'Peripherals'],
  ['28', 'Audio: voice / note queue'], ['29', 'Audio: sequencer'], ['30', 'Audio: stream'],
  ['32', 'GPU: VBlank'], ['33', 'GPU: line'], ['34', 'GPU: copy'], ['35', 'GPU: fault']
];

const PROFILES = [
  ['`micro`', '2 MHz', '2 MHz', '64 KiB', '32 KiB', 'V2', '256×192', 'A1', '16'],
  ['`pocket`', '8 MHz', '8 MHz', '512 KiB', '96 KiB', 'V2', '240×160', 'A1', '32'],
  ['`retro`', '16 MHz', '32 MHz', '2 MiB', '512 KiB', 'V2', '320×240', 'A2', '32'],
  ['`arcade`', '25 MHz', '50 MHz', '8 MiB', '4 MiB', 'V3', '640×480', 'A3', '96'],
  ['`polygon`', '33 MHz', '66 MHz', '16 MiB', '8 MiB', 'V5', '640×480', 'A3', '96'],
  ['`standard` (default)', '50 MHz', '200 MHz', '64 MiB', '32 MiB', 'V5', '1280×720', 'A4', '128'],
  ['`workstation`', '100 MHz', '400 MHz', '512 MiB', '256 MiB', 'V6', '1280×720', 'A4', '256'],
  ['`custom`', '≤ 400 MHz', '≤ 1 GHz', '≤ 2 GiB', '≤ 1 GiB', 'V6', '1920×1080', 'A4', '256']
];

const CYCLES = [
  ['ALU, `mov`, `li`, `lui`, logic, shifts, `cmp`, bit ops', '1'],
  ['Load/store in RAM / VRAM / MMIO', '2 / 3 / 4'],
  ['Conditional jump not taken / taken; `jp`', '1 / 2; 2'],
  ['`call`, `ret`, `bl`, `enter`, `leave`', '3'],
  ['`push`, `pop`', '2'],
  ['`pushm`, `popm`, `fpushm`, `fpopm`', '1 + 2 per register'],
  ['`mul` family / `div`, `mod` family', '3 / 16'],
  ['Float basics and conversions / `fdiv`, `fsqrt`, `fmod` / `fma`', '3 / 12 / 4'],
  ['Block instruction (`mcpy`, `mset`, `mcmp`, `mscan`)', '4 + 1 per 8 bytes'],
  ['Entering an interrupt / `iret`', '12 / 6']
];

const FAULTS = [
  ['0', '`None`', '—'],
  ['1', '`Alignment`', 'Misaligned access to RAM or VRAM'],
  ['2', '`OutOfRam`', 'Address below `0xA0000000` past `RamSize`'],
  ['3', '`OutOfVram`', 'VRAM address past `VramSize`'],
  ['4', '`Unmapped`', 'The empty regions of the map'],
  ['5', '`MmioWidth`', 'MMIO access that is not 32-bit or is misaligned'],
  ['6', '`MmioBlock`', 'Block instruction on MMIO'],
  ['7', '`MmioUndeclared`', 'Undeclared offset with `--strict-mmio`'],
  ['8', '`RegisterPair`', 'Bad register pair in a 64-bit instruction'],
  ['9', '`UnknownOpcode`', 'Unassigned opcode'],
  ['10', '`BadSubfield`', 'Invalid subfield (e.g. `fcvt` type 14 or 15)']
];

function table(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return `${head}\n${sep}\n${body}\n`;
}

function write(name, text) {
  const dir = path.join(ROOT, 'content', 'en', '_gen');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), text, 'utf8');
  console.log(`wrote content/en/_gen/${name}`);
}

write('_memory-map.mdx', table(['Range', 'Size', 'Region', 'Out of range'], MEMORY));
write('_device-slots.mdx', table(['Slot', 'Base', 'Device', 'IRQ'], SLOTS));
write('_exceptions.mdx', table(['#', 'Exception'], EXCEPTIONS));
write('_interrupts.mdx', table(['#', 'Source'], INTERRUPTS));
write('_profiles.mdx', table(['Profile', 'CPU', 'GPU', 'RAM', 'VRAM', 'Video', 'Resolution', 'Audio', 'Sprites/line'], PROFILES));
write('_cycles.mdx', table(['What', 'Cycles'], CYCLES));
write('_fault-reasons.mdx', table(['Code', 'Name', 'When'], FAULTS));

console.log('ok');
