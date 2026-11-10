import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  COMPOSER_FIXTURE_TEST_TIMEOUT_MS,
  createComposerFixture,
  executeFixtureCommand,
  type ComposerFixture,
  removeComposerFixtures,
} from "./composer-fixture.js";

const composerFixtures: ComposerFixture[] = [];

afterEach(() => {
  removeComposerFixtures(composerFixtures);
});

describe("skir CLI integration", () => {
  it("generates executable PHP from a real .skir fixture", () => {
    const fixture = createComposerFixture(
      "skir-laravel-data-generator-cli-",
      composerFixtures,
    );
    const { projectPath } = fixture;
    const skirSourcePath = join(projectPath, "skir-src");
    const adminSkirSourcePath = join(skirSourcePath, "admin");
    const commonSkirSourcePath = join(skirSourcePath, "common");
    const stubClientPath = join(projectPath, "stub-client", "Skir", "Client");
    const generatedPath = join(projectPath, "generated", "skirout");
    const runtimePath = process.env.SKIR_RUNTIME_PATH ?? resolve("../runtime");
    const generatorPath = resolve("dist/index.js");
    const skirBinPath = resolve("node_modules/skir/dist/compiler.js");

    expect(existsSync(generatorPath)).toBe(true);
    expect(existsSync(skirBinPath)).toBe(true);

    mkdirSync(adminSkirSourcePath, { recursive: true });
    mkdirSync(commonSkirSourcePath, { recursive: true });
    mkdirSync(stubClientPath, { recursive: true });

    writeFileSync(
      join(projectPath, "skir.yml"),
      [
        "generators:",
        `  - mod: ${pathToFileURL(generatorPath).href}`,
        "    outDir: generated/skirout",
        "    config:",
        '      namespace: "Skir"',
        "",
      ].join("\n"),
    );

    writeFileSync(
      join(adminSkirSourcePath, "users.skir"),
      [
        'import { Address } from "../common/address.skir";',
        "",
        "/// A registered user.",
        "/// It's \"quoted\" with a back\\slash.",
        "struct User {",
        "  user_id: int32;",
        "  /// The user's display name.",
        "  name: string;",
        "  address: Address;",
        "  previous_addresses: [Address];",
        "  subscription_status: SubscriptionStatus;",
        "  status_history: [SubscriptionStatus];",
        "",
        "  /// Per-user settings.",
        "  struct Preferences {}",
        "",
        "  enum Role {",
        "    admin;",
        "    /// Read-only access.",
        "    viewer;",
        "  }",
        "}",
        "",
        "enum SubscriptionStatus {",
        "  free;",
        "  /// When the premium plan started.",
        "  premium_since: timestamp;",
        "}",
        "",
        "/// Returns the user.",
        "method GetUser(User): User = 3180856469;",
        "",
      ].join("\n"),
    );

    writeFileSync(
      join(adminSkirSourcePath, "profiles.skir"),
      [
        "struct User {",
        "  display_name: string;",
        "}",
        "",
      ].join("\n"),
    );

    writeFileSync(
      join(commonSkirSourcePath, "address.skir"),
      [
        "struct Address {",
        "  city: string;",
        "  postal_codes: [string];",
        "}",
        "",
      ].join("\n"),
    );

    writeFileSync(
      join(projectPath, "composer.json"),
      JSON.stringify(
        {
          repositories: [
            {
              type: "path",
              url: runtimePath,
              options: {
                symlink: false,
              },
            },
          ],
          require: {
            php: "^8.3",
            "illuminate/config": "^10.0|^11.0|^12.0|^13.0",
            "illuminate/translation": "^10.0|^11.0|^12.0|^13.0",
            "illuminate/validation": "^10.0|^11.0|^12.0|^13.0",
            "php-skir/runtime": "*",
            "phpoption/phpoption": "^1.9",
            "spatie/laravel-data": "^4.0",
            "vlucas/phpdotenv": "^5.6",
          },
          autoload: {
            "psr-4": {
              "Skir\\Client\\": "stub-client/Skir/Client/",
            },
          },
          config: {
            "sort-packages": true,
          },
          "minimum-stability": "dev",
          "prefer-stable": true,
        },
        null,
        2,
      ),
    );

    writeFileSync(
      join(stubClientPath, "SkirClient.php"),
      `<?php

declare(strict_types=1);

namespace Skir\\Client;

use Skir\\Runtime\\MethodDescriptor;

final class SkirClient
{
    public function invoke(MethodDescriptor $descriptor, mixed $request): mixed
    {
        if ($descriptor->name !== 'GetUser') {
            throw new \\RuntimeException('Unexpected method descriptor.');
        }

        return $request;
    }
}
`,
    );

    writeFileSync(
      join(projectPath, "verify.php"),
      `<?php

declare(strict_types=1);

require __DIR__.'/vendor/autoload.php';

use Composer\\InstalledVersions;
use Illuminate\\Config\\Repository;
use Illuminate\\Container\\Container;
use Illuminate\\Support\\Facades\\Facade;
use Illuminate\\Translation\\ArrayLoader;
use Illuminate\\Translation\\Translator;
use Illuminate\\Validation\\Factory as ValidatorFactory;

if (! function_exists('app')) {
    function app(?string $abstract = null, array $parameters = []): mixed
    {
        $container = Container::getInstance();

        if ($abstract === null) {
            return $container;
        }

        return $container->make($abstract, $parameters);
    }
}

if (! function_exists('config')) {
    function config(string|array|null $key = null, mixed $default = null): mixed
    {
        $repository = Container::getInstance()->make('config');

        if ($key === null) {
            return $repository;
        }

        if (is_array($key)) {
            foreach ($key as $name => $value) {
                $repository->set($name, $value);
            }

            return null;
        }

        return $repository->get($key, $default);
    }
}

if (! function_exists('base_path')) {
    function base_path(string $path = ''): string
    {
        return __DIR__.($path === '' ? '' : "/{$path}");
    }
}

if (! function_exists('app_path')) {
    function app_path(string $path = ''): string
    {
        return base_path('app'.($path === '' ? '' : "/{$path}"));
    }
}

if (! function_exists('storage_path')) {
    function storage_path(string $path = ''): string
    {
        return base_path('storage'.($path === '' ? '' : "/{$path}"));
    }
}

$container = new Container();
Container::setInstance($container);
Facade::setFacadeApplication($container);

$container->instance('config', new Repository([
    'data' => require __DIR__.'/vendor/spatie/laravel-data/config/data.php',
]));

$translator = new Translator(new ArrayLoader(), 'en');
$validator = new ValidatorFactory($translator, $container);

$container->instance('validator', $validator);
$container->alias('validator', \\Illuminate\\Contracts\\Validation\\Factory::class);

use Skir\\Admin\\SkirMethods;
use Skir\\Admin\\SkirRpcClient;
use Skir\\Admin\\SubscriptionStatusData;
use Skir\\Admin\\UsersUserData;
use Skir\\Common\\AddressData;
use Skir\\Client\\SkirClient as TransportSkirClient;

if (! InstalledVersions::isInstalled('spatie/laravel-data')) {
    throw new RuntimeException('spatie/laravel-data was not installed.');
}

if (! InstalledVersions::isInstalled('php-skir/runtime')) {
    throw new RuntimeException('php-skir/runtime was not installed.');
}

$user = new UsersUserData(
    userId: 400,
    name: 'John Doe',
    address: new AddressData(city: 'Antwerp', postalCodes: ['2000', '2018']),
    previousAddresses: [
        new AddressData(city: 'Brussels', postalCodes: ['1000']),
    ],
    subscriptionStatus: SubscriptionStatusData::premiumSince(1743682787000),
    statusHistory: [
        SubscriptionStatusData::free(),
        SubscriptionStatusData::premiumSince(1743682787000),
    ],
);

if ($user->toSkirJson() !== '[400,"John Doe",["Antwerp",["2000","2018"]],[["Brussels",["1000"]]],[2,1743682787000],[1,[2,1743682787000]]]') {
    throw new RuntimeException('Unexpected user dense JSON: '.$user->toSkirJson());
}

$decodedUser = UsersUserData::fromSkir('[400,"John Doe",["Antwerp",["2000","2018"]],[["Brussels",["1000"]]],[2,1743682787000],[1,[2,1743682787000]]]');

if ($decodedUser->address->city !== 'Antwerp' || $decodedUser->previousAddresses[0]->city !== 'Brussels') {
    throw new RuntimeException('Unexpected decoded user.');
}

if ($decodedUser->subscriptionStatus->name() !== 'premium_since' || $decodedUser->subscriptionStatus->payload() !== 1743682787000) {
    throw new RuntimeException('Unexpected decoded status field.');
}

if (count($decodedUser->statusHistory) !== 2 || $decodedUser->statusHistory[0]->name() !== 'free') {
    throw new RuntimeException('Unexpected decoded status history.');
}

$status = SubscriptionStatusData::premiumSince(1743682787000);

if ($status->toDenseJson() !== '[2,1743682787000]') {
    throw new RuntimeException('Unexpected status dense JSON: '.$status->toDenseJson());
}

$method = SkirMethods::getUser();

if ($method->name !== 'GetUser' || $method->number !== 3180856469) {
    throw new RuntimeException('Unexpected method descriptor.');
}

$memberDoc = static function (array $members, string $name): ?string {
    foreach ($members as $member) {
        if ($member->name === $name) {
            return $member->doc;
        }
    }

    throw new RuntimeException('No descriptor member named '.$name.'.');
};
$userType = \\Skir\\Admin\\UsersUserData::skirType();
$preferencesType = \\Skir\\Admin\\UserPreferencesData::skirType();
$roleType = \\Skir\\Admin\\UserRoleData::skirType();
$statusType = \\Skir\\Admin\\SubscriptionStatusData::skirType();
$metadata = [
    'struct record id' => [$userType->recordId, 'admin/users.skir:User'],
    'struct doc' => [$userType->doc, "A registered user.\\nIt's \\"quoted\\" with a back\\\\slash."],
    'field doc' => [$memberDoc($userType->fields, 'name'), "The user's display name."],
    'undocumented field doc' => [$memberDoc($userType->fields, 'user_id'), null],
    'nested empty struct record id' => [$preferencesType->recordId, 'admin/users.skir:User.Preferences'],
    'nested empty struct doc' => [$preferencesType->doc, 'Per-user settings.'],
    'nested enum record id' => [$roleType->recordId, 'admin/users.skir:User.Role'],
    'undocumented enum doc' => [$roleType->doc, null],
    'constant variant doc' => [$memberDoc($roleType->variants, 'viewer'), 'Read-only access.'],
    'undocumented variant doc' => [$memberDoc($roleType->variants, 'admin'), null],
    'enum record id' => [$statusType->recordId, 'admin/users.skir:SubscriptionStatus'],
    'wrapper variant doc' => [$memberDoc($statusType->variants, 'premium_since'), 'When the premium plan started.'],
    'imported struct record id' => [\\Skir\\Common\\AddressData::skirType()->recordId, 'common/address.skir:Address'],
    'method doc' => [$method->doc, 'Returns the user.'],
];

foreach ($metadata as $label => [$actual, $expected]) {
    if ($actual !== $expected) {
        throw new RuntimeException('Unexpected '.$label.': '.var_export($actual, true));
    }
}

$rpcClient = new SkirRpcClient(new TransportSkirClient());
$rpcUser = $rpcClient->getUser($user);

if (! $rpcUser instanceof UsersUserData || $rpcUser->name !== 'John Doe') {
    throw new RuntimeException('Unexpected generated client response.');
}
`,
    );

    executeFixtureCommand(fixture, "node", [skirBinPath, "gen", "--root", projectPath], {
      cwd: resolve("."),
      timeout: 60_000,
    });

    executeFixtureCommand(
      fixture,
      "node",
      [
        resolve("dist/cli.js"),
        "configure-composer",
        "--root",
        projectPath,
        "--mod",
        pathToFileURL(generatorPath).href,
      ],
      { cwd: resolve("."), timeout: 30_000 },
    );

    expect(JSON.parse(readFileSync(join(projectPath, "composer.json"), "utf8")))
      .toMatchObject({
        autoload: {
          "psr-4": {
            "Skir\\": "generated/skirout/",
          },
        },
      });

    const generatedFiles = [
      join(generatedPath, "Admin", "AbstractSkirProcedures.php"),
      join(generatedPath, "Admin", "UsersUserData.php"),
      join(generatedPath, "Admin", "ProfilesUserData.php"),
      join(generatedPath, "Admin", "SubscriptionStatusData.php"),
      join(generatedPath, "Admin", "AdminSkirMethod.php"),
      join(generatedPath, "Admin", "SkirMethods.php"),
      join(generatedPath, "Admin", "SkirProcedureProvider.php"),
      join(generatedPath, "Admin", "SkirProcedures.php"),
      join(generatedPath, "Admin", "SkirRpcClient.php"),
      join(generatedPath, "Common", "AddressData.php"),
    ];

    for (const generatedFile of generatedFiles) {
      expect(existsSync(generatedFile)).toBe(true);
      executeFixtureCommand(fixture, "php", ["-l", generatedFile], {
        timeout: 15_000,
      });
    }

    expect(existsSync(join(generatedPath, "Admin", "UserData.php"))).toBe(false);

    const manifestPath = join(generatedPath, "skir-server-manifest.json");

    expect(existsSync(manifestPath)).toBe(true);

    expect(JSON.parse(readFileSync(manifestPath, "utf8"))).toEqual({
      version: 1,
      generator: "skir-laravel-data-generator",
      modules: [
        {
          name: "Admin",
          methodEnum: "Skir\\Admin\\AdminSkirMethod",
          methods: [
            {
              name: "GetUser",
              enumCase: "GetUser",
              phpMethod: "getUser",
              requestType: "Skir\\Admin\\UsersUserData",
              requestClass: "Skir\\Admin\\UsersUserData",
              responseType: "Skir\\Admin\\UsersUserData",
              responseClass: "Skir\\Admin\\UsersUserData",
            },
          ],
        },
      ],
    });

    const userCode = readFileSync(join(generatedPath, "Admin", "UsersUserData.php"), "utf8");
    const methodsCode = readFileSync(join(generatedPath, "Admin", "SkirMethods.php"), "utf8");
    const providerCode = readFileSync(join(generatedPath, "Admin", "SkirProcedureProvider.php"), "utf8");
    const clientCode = readFileSync(join(generatedPath, "Admin", "SkirRpcClient.php"), "utf8");
    const preferencesCode = readFileSync(join(generatedPath, "Admin", "UserPreferencesData.php"), "utf8");
    const roleCode = readFileSync(join(generatedPath, "Admin", "UserRoleData.php"), "utf8");
    const methodDescriptorsCode = readFileSync(join(generatedPath, "Admin", "SkirMethods.php"), "utf8");

    expect(userCode).toContain(
      "], recordId: 'admin/users.skir:User', doc: 'A registered user.'.\"\\n\".'It\\'s \"quoted\" with a back\\\\slash.');",
    );
    expect(userCode).toContain("Field::value('user_id', 0, Type::int32()),");
    expect(userCode).toContain("Field::value('name', 1, Type::string(), doc: 'The user\\'s display name.'),");
    expect(preferencesCode).toMatch(
      /Type::struct\(\[\s*\], recordId: 'admin\/users\.skir:User\.Preferences', doc: 'Per-user settings\.'\);/,
    );
    expect(roleCode).toContain("Variant::constant('admin', 1),");
    expect(roleCode).toContain("Variant::constant('viewer', 2, doc: 'Read-only access.'),");
    expect(roleCode).toContain("], recordId: 'admin/users.skir:User.Role');");
    expect(methodDescriptorsCode).toContain("doc: 'Returns the user.',");

    expect(userCode).toContain("use Skir\\Common\\AddressData;");
    expect(userCode).not.toContain("\\Skir\\Common\\AddressData");
    expect(methodsCode).toContain("requestType: UsersUserData::skirType()");
    expect(methodsCode).toContain("responseType: UsersUserData::skirType()");
    expect(providerCode).toContain("namespace Skir\\Admin;");
    expect(clientCode).toContain("public function getUser(UsersUserData $request): UsersUserData");

    executeFixtureCommand(
      fixture,
      "composer",
      ["install", "--no-interaction", "--no-progress"],
    );

    executeFixtureCommand(fixture, "php", ["verify.php"], {
      timeout: 30_000,
    });
  }, COMPOSER_FIXTURE_TEST_TIMEOUT_MS);
});
