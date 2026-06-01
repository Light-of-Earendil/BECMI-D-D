<?php
/**
 * Shared portrait prompt builder for Together AI image generation.
 */
class PortraitPromptBuilder {
    /**
     * Build a descriptive prompt from character data.
     *
     * @param array<string, mixed> $data
     */
    public static function build(array $data): string {
        $parts = [];
        $parts[] = 'Photorealistic medieval low-fantasy gritty character portrait';

        $gender = strtolower(trim((string) ($data['gender'] ?? '')));
        if ($gender !== '') {
            $parts[] = $gender;
        }

        $class = strtolower(trim((string) ($data['class'] ?? '')));
        $classDescription = self::getClassDescription($class);
        if ($classDescription !== '') {
            $parts[] = $classDescription;
        }

        $hairColor = trim((string) ($data['hair_color'] ?? ''));

        $age = isset($data['age']) ? (int) $data['age'] : 0;
        if ($age > 0) {
            $parts[] = self::getAgeDescription($age, $gender, $hairColor);
        }

        if ($hairColor !== '') {
            $parts[] = 'with ' . strtolower($hairColor) . ' hair';
        }

        $eyeColor = trim((string) ($data['eye_color'] ?? ''));
        if ($eyeColor !== '') {
            $parts[] = strtolower($eyeColor) . ' eyes';
        }

        $height = trim((string) ($data['height'] ?? ''));
        if ($height !== '') {
            $parts[] = 'height ' . $height;
        }

        $weight = trim((string) ($data['weight'] ?? ''));
        if ($weight !== '') {
            $parts[] = 'build ' . $weight;
        }

        foreach (self::getAbilityDescriptions($data) as $abilityDescription) {
            $parts[] = $abilityDescription;
        }

        $background = trim((string) ($data['background'] ?? ($data['backstory'] ?? '')));
        if ($background !== '') {
            $parts[] = 'character background: ' . self::truncateText($background, 180);
        }

        $equipment = trim((string) ($data['equipment'] ?? ''));
        if ($equipment !== '' && stripos($equipment, 'no equipment') === false) {
            $parts[] = 'equipped with ' . self::truncateText($equipment, 120);
        }

        $parts[] = 'head and shoulders portrait';
        $parts[] = 'looking at viewer';
        $parts[] = 'detailed facial features';
        $parts[] = 'dramatic lighting';
        $parts[] = 'Dungeons and Dragons BECMI fantasy character art';

        return implode(', ', $parts);
    }

    private static function getClassDescription(string $class): string {
        $classDescriptions = [
            'fighter' => 'human warrior in metal armor with sword and shield',
            'magic_user' => 'human wizard in flowing robes with mystical aura',
            'cleric' => 'human holy priest with religious symbols and divine light',
            'thief' => 'human rogue in leather armor with daggers',
            'dwarf' => 'stout dwarven warrior with thick beard',
            'elf' => 'elegant elven adventurer with pointed ears',
            'halfling' => 'cheerful halfling adventurer',
            'druid' => 'nature priest with wooden staff and natural clothing',
            'mystic' => 'martial artist monk in simple robes',
            'barbarian' => 'fierce barbarian warrior in fur and leather, tribal war paint, primal wild warrior, axe or great weapon',
        ];

        if (isset($classDescriptions[$class])) {
            return $classDescriptions[$class];
        }

        if ($class !== '') {
            return str_replace('_', ' ', $class) . ' adventurer';
        }

        return '';
    }

    private static function getAgeDescription(int $age, string $gender, string $hairColor = ''): string {
        $subject = match ($gender) {
            'male' => 'man',
            'female' => 'woman',
            'other', 'non-binary', 'non_binary' => 'person',
            default => 'person',
        };

        $agedHair = preg_match('/\b(grey|gray|white|silver)\b/i', $hairColor) === 1;

        if ($age < 18) {
            return "teenage {$subject}, approximately {$age} years old, youthful face";
        }

        if ($age <= 29) {
            $description = "young adult {$subject}, exactly {$age} years old, youthful face, smooth skin, no wrinkles";
            if (!$agedHair) {
                $description .= ', no grey hair, no grey beard';
            }
            return $description;
        }

        if ($age <= 39) {
            return "adult {$subject} in their thirties, approximately {$age} years old";
        }

        if ($age <= 49) {
            return "adult {$subject} in their forties, approximately {$age} years old";
        }

        if ($age <= 59) {
            return "middle-aged {$subject}, approximately {$age} years old";
        }

        return "older {$subject} with weathered features, approximately {$age} years old";
    }

    private static function getAbilityDescriptions(array $data): array {
        $descriptions = [];

        $strength = self::getAbilityScore($data, 'strength');
        if ($strength !== null) {
            $descriptions[] = self::getStrengthDescription($strength);
        }

        $constitution = self::getAbilityScore($data, 'constitution');
        if ($constitution !== null) {
            $description = self::getConstitutionDescription($constitution);
            if ($description !== '') {
                $descriptions[] = $description;
            }
        }

        $dexterity = self::getAbilityScore($data, 'dexterity');
        if ($dexterity !== null && ($dexterity <= 8 || $dexterity >= 14)) {
            $description = self::getDexterityDescription($dexterity);
            if ($description !== '') {
                $descriptions[] = $description;
            }
        }

        $intelligence = self::getAbilityScore($data, 'intelligence');
        if ($intelligence !== null && ($intelligence <= 8 || $intelligence >= 14)) {
            $description = self::getIntelligenceDescription($intelligence);
            if ($description !== '') {
                $descriptions[] = $description;
            }
        }

        $wisdom = self::getAbilityScore($data, 'wisdom');
        if ($wisdom !== null && ($wisdom <= 8 || $wisdom >= 14)) {
            $description = self::getWisdomDescription($wisdom);
            if ($description !== '') {
                $descriptions[] = $description;
            }
        }

        $charisma = self::getAbilityScore($data, 'charisma');
        if ($charisma !== null && ($charisma <= 8 || $charisma >= 14)) {
            $description = self::getCharismaDescription($charisma);
            if ($description !== '') {
                $descriptions[] = $description;
            }
        }

        return $descriptions;
    }

    private static function getAbilityScore(array $data, string $ability): ?int {
        if (!array_key_exists($ability, $data) || $data[$ability] === '' || $data[$ability] === null) {
            return null;
        }

        $score = (int) $data[$ability];
        if ($score < 3 || $score > 18) {
            return null;
        }

        return $score;
    }

    private static function getStrengthDescription(int $score): string {
        if ($score <= 5) {
            return 'frail weak physique, thin arms, underdeveloped muscle, not physically imposing';
        }

        if ($score <= 8) {
            return 'slender build, low muscle mass, physically unimposing';
        }

        if ($score <= 12) {
            return 'average athletic build with normal muscle tone';
        }

        if ($score <= 15) {
            return 'noticeably fit and strong, athletic muscular physique, broad shoulders';
        }

        if ($score === 16 || $score === 17) {
            return 'very muscular powerful build, thick arms, broad shoulders, strong warrior physique';
        }

        return 'extremely muscular massively built physique, bodybuilder-level muscle, huge shoulders and thick arms, peak human strength, intimidating physical power';
    }

    private static function getConstitutionDescription(int $score): string {
        if ($score <= 8) {
            return 'sickly fragile appearance, pale and delicate complexion';
        }

        if ($score <= 12) {
            return '';
        }

        if ($score <= 15) {
            return 'robust hardy appearance, healthy vigorous complexion';
        }

        return 'exceptionally hearty and resilient, vigorous warrior stamina visible in bearing';
    }

    private static function getDexterityDescription(int $score): string {
        if ($score <= 8) {
            return 'stiff awkward posture';
        }

        if ($score <= 13) {
            return '';
        }

        if ($score <= 15) {
            return 'agile balanced posture, lithe athletic poise';
        }

        return 'graceful agile movement, exceptional physical poise';
    }

    private static function getIntelligenceDescription(int $score): string {
        if ($score <= 8) {
            return 'simple earnest facial expression';
        }

        if ($score <= 13) {
            return '';
        }

        if ($score <= 15) {
            return 'sharp intelligent eyes, alert expression';
        }

        return 'highly intelligent piercing gaze, thoughtful alert expression';
    }

    private static function getWisdomDescription(int $score): string {
        if ($score <= 8) {
            return 'naive inexperienced expression';
        }

        if ($score <= 13) {
            return '';
        }

        if ($score <= 15) {
            return 'calm perceptive gaze';
        }

        return 'wise perceptive eyes, knowing calm expression';
    }

    private static function getCharismaDescription(int $score): string {
        if ($score <= 8) {
            return 'plain unremarkable facial features';
        }

        if ($score <= 13) {
            return '';
        }

        if ($score <= 15) {
            return 'attractive compelling facial features';
        }

        return 'striking charismatic heroic features, magnetic commanding presence';
    }

    private static function truncateText(string $text, int $maxLength): string {
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;
        if (strlen($text) <= $maxLength) {
            return $text;
        }

        return substr($text, 0, $maxLength - 3) . '...';
    }
}
