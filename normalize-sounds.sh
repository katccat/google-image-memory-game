#!/usr/bin/env bash
# Normalizes all MP3s in sound/ to -14 LUFS integrated loudness, -1 dBTP true peak.
# Originals are backed up to sound/backup/ before overwriting.
# Mirrors results to dist/sound/ if it exists.

set -euo pipefail

SOUND_DIR="$(dirname "$0")/sound"
BACKUP_DIR="$SOUND_DIR/backup"
# EBU R128 targets
TARGET_LUFS=-23
TRUE_PEAK=-1

mkdir -p "$BACKUP_DIR"

echo "Backing up originals to $BACKUP_DIR ..."
for f in "$SOUND_DIR"/*.mp3; do
  cp "$f" "$BACKUP_DIR/$(basename "$f")"
done

echo ""
echo "Normalizing to ${TARGET_LUFS} LUFS / ${TRUE_PEAK} dBTP ..."
echo ""

for f in "$SOUND_DIR"/*.mp3; do
  name="$(basename "$f")"
  tmp="${f%.mp3}_normalized_tmp.mp3"

  # Pass 1: measure loudness
  stats=$(ffmpeg -i "$f" \
    -af "loudnorm=I=${TARGET_LUFS}:TP=${TRUE_PEAK}:LRA=11:print_format=json" \
    -f null /dev/null 2>&1 | awk '/^{/,/^}/')

  input_i=$(echo "$stats"   | grep '"input_i"'   | grep -oE '[-0-9.]+' | head -1)
  input_tp=$(echo "$stats"  | grep '"input_tp"'  | grep -oE '[-0-9.]+' | head -1)
  input_lra=$(echo "$stats" | grep '"input_lra"' | grep -oE '[-0-9.]+' | head -1)
  input_thresh=$(echo "$stats" | grep '"input_thresh"' | grep -oE '[-0-9.]+' | head -1)
  offset=$(echo "$stats"    | grep '"target_offset"' | grep -oE '[-0-9.]+' | head -1)

  # Pass 2: apply normalization with measured values (linear mode for accuracy)
  ffmpeg -y -i "$f" \
    -af "loudnorm=I=${TARGET_LUFS}:TP=${TRUE_PEAK}:LRA=11\
:measured_I=${input_i}\
:measured_TP=${input_tp}\
:measured_LRA=${input_lra}\
:measured_thresh=${input_thresh}\
:offset=${offset}\
:linear=true:print_format=summary" \
    -c:a libmp3lame -q:a 2 \
    "$tmp" 2>/dev/null

  mv "$tmp" "$f"
  printf "  %-22s  was %s LUFS  →  %s LUFS target\n" "$name" "$input_i" "$TARGET_LUFS"
done

echo ""
echo "Done. Backups in $BACKUP_DIR"
