# Skir Laravel Data Generator

Generates Spatie Laravel Data objects for Skir schemas.

Generated PHP code uses `spatie/laravel-data` for DTO creation and validation, and `laravel-skir/runtime` for dense JSON serialization. If you use generated RPC clients, install `laravel-skir/client` as well.

## Installation

```bash
npm install --save-dev skir-laravel-data-generator
composer require laravel-skir/runtime spatie/laravel-data
```

For generated typed RPC clients:

```bash
composer require laravel-skir/client
```

## Releasing

Create a GitHub release for the version in `package.json`. The release workflow reruns type checks, build, package validation, and tests before publishing to npm with provenance. It expects an `NPM_TOKEN` repository secret.

## Usage with Skir

Add the generator to `skir.yml`:

```yaml
generators:
  laravel-data:
    package: skir-laravel-data-generator
    output: generated/php
    config:
      namespace: App\Skir
```

Then run the Skir generator command for your project.

## Generated PHP

The generator emits Laravel Data classes for Skir structs and enum wrapper classes for Skir enums. Generated classes expose:

- `skirType()` for runtime type descriptors.
- `fromSkir()` for dense JSON string creation with Laravel Data validation.
- `toSkir()` and `toSkirJson()` for dense JSON payloads.
- `toSkirValue()` and `fromSkirValue()` on generated enum classes.

SkirRPC methods are emitted in `SkirMethods.php` as `MethodDescriptor` instances. The generator also emits a module-scoped method enum such as `AdminSkirMethod.php` for attribute-based server routing.

When a module defines SkirRPC methods, the generator also emits `SkirRpcClient.php`. It wraps `LaravelSkir\Client\SkirClient` and exposes typed methods:

```php
use App\Skir\Admin\SkirRpcClient;
use LaravelSkir\Client\SkirClient as TransportSkirClient;

$client = new SkirRpcClient(new TransportSkirClient('https://example.com/skir'));
$user = $client->getUser($requestData);
```

Responses are hydrated through `makeFromSkirPayload()`, so Laravel Data validation is still applied to returned struct objects.

For servers, the generator emits `AdminSkirMethod.php`, `AbstractSkirProcedures.php`, `SkirProcedures.php`, and `SkirProcedureProvider.php`.

The recommended Laravel server path is to use the generated method enum with `laravel-skir/server` controller routing:

```php
use App\Skir\Admin\AdminSkirMethod;
use App\Skir\Admin\GetUserRequestData;
use App\Skir\Admin\UserData;
use LaravelSkir\Server\Attributes\SkirMethod;
use LaravelSkir\Server\SkirContext;

final class UserController
{
    #[SkirMethod(AdminSkirMethod::GetUser)]
    public function get(GetUserRequestData $request, SkirContext $context): UserData
    {
        return new UserData(
            userId: $request->userId,
            name: 'Maxim',
        );
    }
}
```

Register the controller on a Skir endpoint:

```php
use App\Skir\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use LaravelSkir\Server\Facades\Skir;

Route::skirRpc('/api/skir', [
    Skir::controller(UserController::class),
]);
```

The method enum resolves back to `SkirMethods::getUser()`, so the Skir schema remains the source of truth while your IDE can autocomplete enum cases. The server dispatcher hydrates incoming struct requests with `makeFromSkirPayload()` and converts returned data objects with `toSkirArray()`. Laravel Data validation runs before your controller method is called.

The abstract procedure and interface/provider pair remain available as lower-level compatibility APIs.

## Namespaces and modules

The configured namespace defaults to `App\Skir`. Module directories become PHP subnamespaces and output directories:

```text
admin/users.skir -> App\Skir\Admin
```

When two generated records would otherwise use the same PHP class name in the same namespace, the generator prefixes the class with the module basename to keep output deterministic.

## Current scope

This package generates Laravel Data DTOs, method descriptors, typed client adapters, and Laravel Skir server procedure adapters. Server routing lives in a separate package.
