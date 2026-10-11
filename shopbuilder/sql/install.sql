-- ShopBuilder : tables créées automatiquement au démarrage si absentes.

CREATE TABLE IF NOT EXISTS `shopbuilder_shops` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `label` varchar(100) NOT NULL,
  `type` varchar(30) NOT NULL DEFAULT 'custom',
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `settings` longtext DEFAULT NULL,
  `items` longtext DEFAULT NULL,
  `locations` longtext DEFAULT NULL,
  `stats` longtext DEFAULT NULL,
  `created_by` varchar(80) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_shopbuilder_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `shopbuilder_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shop_id` int(11) NOT NULL DEFAULT 0,
  `shop_label` varchar(100) DEFAULT NULL,
  `identifier` varchar(80) DEFAULT NULL,
  `player_name` varchar(100) DEFAULT NULL,
  `action` varchar(40) NOT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `amount` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_shopbuilder_logs_shop` (`shop_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `shopbuilder_settings` (
  `k` varchar(50) NOT NULL,
  `v` longtext DEFAULT NULL,
  PRIMARY KEY (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
