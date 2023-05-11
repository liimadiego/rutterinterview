{ pkgs }: {
	deps = [
		pkgs.systemd
  pkgs.sudo
  pkgs.mysql80
  pkgs.nodejs-18_x
    pkgs.nodePackages.typescript-language-server
    pkgs.yarn
    pkgs.replitPackages.jest
	];
}