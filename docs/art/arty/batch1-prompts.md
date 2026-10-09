# Batch 1 prompts (for GenerateImage). Refs on EVERY call: /workspace/art/style-anchors/APPROVED_style_bright_detailed_battle.png
# Hero also: /workspace/art/refsheets/hero_v1.png. Pose calls also pass the character's src/<id>/idle.png.
# Save outputs as /workspace/art/sprites/src/<id>/{idle,attack_windup,attack_strike,attack_recover,hurt}.png
# (+ optional idle2.png), log each in src/<id>/provenance.json, then run:
#   /workspace/art/.venv/bin/python /workspace/art/tools/build_sprites.py
# Then Read every src/<id>/frame_*.png and preview_batch1.png; check build_report.json (touches_edge / *_resid must be false/0).

COMMON SUFFIX: "Single game battle sprite, full body fully visible with generous empty margin on all sides, in the exact
painterly style of the reference image: bright full color, fine detail, refined slightly-chibi proportions (less cartoony
than typical chibi), clean linework, soft cel shading with painted highlights. Isolated on a perfectly flat solid {KEY}
background, no ground shadow, no scenery, no text, no letters, no watermark, no border."
KEY = pure green #00FF00 (hero, rabbit, rabbitking); pure magenta #FF00FF (mushroom, bee, spider, queenbee)

hero idle: "Young adventurer hero from the reference sheet: messy dark-brown hair, teal hooded cape with gold trim, teal tunic,
  leather belt and satchel, short sword in hand; three-quarter view facing RIGHT, relaxed ready battle stance." + SUFFIX
rabbit idle: "Hostile wild horned rabbit monster, scruffy gray-brown fur, exactly ONE sharp horn in the center of its forehead
  (a single horn, not two), glowing red eyes, bared buck teeth, crouched aggressive stance, facing LEFT. Clearly an enemy,
  not cute, not a pet; stylized, not gritty or realistic." + SUFFIX   (design cues: refsheets/horned_rabbit_enemy_v1.png)
mushroom idle: "Mushroom Imp monster, Western fantasy: red-brown spotted mushroom cap, stubby body with small arms and legs,
  mischievous angry face, facing LEFT, hostile fighting stance." + SUFFIX
rabbitking idle: "Horned Rabbit King boss: larger, imposing horned rabbit with exactly ONE sharp horn on its forehead, red eyes,
  bared buck teeth, scruffy gray-brown fur, small gold crown, flowing red royal cape, standing tall and menacing, facing LEFT." + SUFFIX
bee idle: "Jumbo Bee monster: oversized fuzzy yellow-and-black bumblebee, translucent wings mid-beat, big stinger, angry eyes,
  hovering in flight, facing LEFT." + SUFFIX
spider idle: "Forest Spider monster: big dark-green and brown forest spider, eight legs, several glinting eyes, fangs,
  menacing but stylized and not too creepy for kids, low crouched stance, facing LEFT." + SUFFIX
queenbee idle: "Queen Bee realm boss: large regal queen bee, elongated striped abdomen with prominent stinger, gold crown,
  royal bearing, translucent wings, hovering in flight, facing LEFT." + SUFFIX

POSES (pass the idle base as reference; prefix): "Exact same character as the reference sprite, identical design, colors,
  proportions and facing direction ({RIGHT|LEFT}), now in {POSE}." + SUFFIX
  attack_windup: "an attack wind-up pose, pulling back to strike"
  attack_strike: "the attack strike pose at full extension (hero: sword slash; rabbit/king: horn lunge; mushroom: headbutt/
                  spore punch; bee/queen: stinger jab; spider: fang lunge)"
  attack_recover: "recovering from the attack, returning toward the ready stance"
  hurt: "a hurt/recoil pose, flinching backward away from the attack, pained expression"
