import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  const password = 'cafe-con-pan-1892';

  it('verifica la contraseña correcta', async () => {
    const stored = await hashPassword(password);
    await expect(verifyPassword(password, stored)).resolves.toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const stored = await hashPassword(password);
    await expect(verifyPassword(`${password}!`, stored)).resolves.toBe(false);
  });

  it('usa una sal distinta en cada hash', async () => {
    expect(await hashPassword(password)).not.toBe(await hashPassword(password));
  });

  it('guarda el esquema y los parámetros junto al hash', async () => {
    const [scheme, cost, blockSize, parallelization] = (
      await hashPassword(password)
    ).split('$');
    expect([scheme, cost, blockSize, parallelization]).toEqual([
      'scrypt',
      '65536',
      '8',
      '1',
    ]);
  });

  it('acepta un hash con parámetros más bajos que los actuales', async () => {
    // Simula una contraseña guardada antes de endurecer los parámetros.
    const stored = await hashPassword(password);
    const [, , , , salt, key] = stored.split('$');
    expect(
      await verifyPassword(
        password,
        ['scrypt', 65536, 8, 1, salt, key].join('$'),
      ),
    ).toBe(true);
  });

  it('trata formas Unicode equivalentes como la misma contraseña', async () => {
    // Se derivan en ejecución: escritas literalmente, ambas formas se ven
    // iguales en el editor y un formateador podría dejar el test sin efecto.
    const precomposed = 'café-seguro-2026';
    const decomposed = precomposed.normalize('NFD');
    expect(decomposed).not.toBe(precomposed);

    const stored = await hashPassword(precomposed);
    await expect(verifyPassword(decomposed, stored)).resolves.toBe(true);
  });

  it('devuelve false si scrypt rechaza los parámetros guardados', async () => {
    // N debe ser potencia de dos; un 3 hace fallar la derivación, no la petición.
    const [, , , , salt, key] = (await hashPassword(password)).split('$');
    await expect(
      verifyPassword(password, ['scrypt', 3, 8, 1, salt, key].join('$')),
    ).resolves.toBe(false);
  });

  describe('hashes no utilizables', () => {
    it.each([
      ['cadena vacía', ''],
      ['otro esquema', 'bcrypt$65536$8$1$c2FsdA==$aGFzaA=='],
      ['sin todas las partes', 'scrypt$65536$8$1'],
      ['parámetro no numérico', 'scrypt$x$8$1$c2FsdA==$aGFzaA=='],
      ['parámetro en cero', 'scrypt$0$8$1$c2FsdA==$aGFzaA=='],
      ['clave de largo incorrecto', 'scrypt$65536$8$1$c2FsdA==$aGFzaA=='],
    ])('devuelve false con %s', async (_, stored) => {
      await expect(verifyPassword(password, stored)).resolves.toBe(false);
    });
  });
});
