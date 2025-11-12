import { Check, X } from "lucide-react";

const ComparisonTable = () => {
  const features = [
    {
      feature: "Modern, Clean UI",
      rabbitGui: true,
      management: false,
      prometheus: false,
      cloudAmqp: true,
      amazonMq: true,
    },
    {
      feature: "Live Monitoring",
      rabbitGui: true,
      management: true,
      prometheus: true,
      cloudAmqp: true,
      amazonMq: true,
    },
    {
      feature: "Easy Setup",
      rabbitGui: true,
      management: true,
      prometheus: false,
      cloudAmqp: true,
      amazonMq: true,
    },
    {
      feature: "Cost Effective",
      rabbitGui: true,
      management: true,
      prometheus: true,
      cloudAmqp: false,
      amazonMq: false,
    },
    {
      feature: "No Complex Configuration",
      rabbitGui: true,
      management: false,
      prometheus: false,
      cloudAmqp: true,
      amazonMq: true,
    },
    {
      feature: "Advanced Analytics",
      rabbitGui: true,
      management: false,
      prometheus: true,
      cloudAmqp: true,
      amazonMq: true,
    },
  ];

  const CheckIcon = () => <Check className="h-5 w-5 text-green-500 mx-auto" />;
  const XIcon = () => <X className="h-5 w-5 text-red-400 mx-auto" />;

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
              Feature
            </th>
            <th className="px-6 py-4 text-center text-sm font-semibold bg-gradient-to-r from-primary to-destructive text-primary-foreground">
              RabbitHQ
            </th>
            <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">
              Management Plugin
            </th>
            <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">
              Prometheus + Grafana
            </th>
            <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">
              CloudAMQP
            </th>
            <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">
              Amazon MQ
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {features.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                {row.feature}
              </td>
              <td className="px-6 py-4 text-center bg-primary/5">
                {row.rabbitGui ? <CheckIcon /> : <XIcon />}
              </td>
              <td className="px-6 py-4 text-center">
                {row.management ? <CheckIcon /> : <XIcon />}
              </td>
              <td className="px-6 py-4 text-center">
                {row.prometheus ? <CheckIcon /> : <XIcon />}
              </td>
              <td className="px-6 py-4 text-center">
                {row.cloudAmqp ? <CheckIcon /> : <XIcon />}
              </td>
              <td className="px-6 py-4 text-center">
                {row.amazonMq ? <CheckIcon /> : <XIcon />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;
